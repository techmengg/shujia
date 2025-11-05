"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";

interface ReadingListEntrySnapshot {
  progress: string | null;
  rating: number | null;
  notes: string | null;
}

interface ReadingListFormValues {
  progress: string;
  rating: string;
  notes: string;
}

interface AddToReadingListButtonProps {
  mangaId: string;
  isAuthenticated: boolean;
  className?: string;
  initiallyAdded?: boolean;
  initialEntry?: ReadingListEntrySnapshot | null;
}

type ActionState = "idle" | "saving" | "success" | "error";
type DialogStatus = "idle" | "saving" | "removing";

export function AddToReadingListButton({
  mangaId,
  isAuthenticated,
  className,
  initiallyAdded = false,
  initialEntry = null,
}: AddToReadingListButtonProps) {
  const toFormValues = useMemo(
    () =>
      (entry?: ReadingListEntrySnapshot | null): ReadingListFormValues => ({
        progress: entry?.progress ?? "",
        rating:
          typeof entry?.rating === "number" && !Number.isNaN(entry.rating)
            ? entry.rating.toString()
            : "",
        notes: entry?.notes ?? "",
      }),
    [],
  );

  const [entrySnapshot, setEntrySnapshot] = useState<ReadingListEntrySnapshot | null>(
    initialEntry,
  );
  const [formValues, setFormValues] = useState<ReadingListFormValues>(
    () => toFormValues(initialEntry),
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<DialogStatus>("idle");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(initiallyAdded || Boolean(initialEntry));
  const [state, setState] = useState<ActionState>(
    initiallyAdded || Boolean(initialEntry) ? "success" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsAdded(initiallyAdded || Boolean(initialEntry));
    setEntrySnapshot(initialEntry ?? null);
    setFormValues(toFormValues(initialEntry));
    setState(initiallyAdded || Boolean(initialEntry) ? "success" : "idle");
  }, [initialEntry, initiallyAdded, toFormValues]);

  const scheduleReset = (nextAdded: boolean) => {
    window.setTimeout(() => {
      setState(nextAdded ? "success" : "idle");
      setMessage(null);
    }, 2400);
  };

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className={[
          "inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:-translate-y-0.5 hover:border-white hover:text-white",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Log in to add
      </Link>
    );
  }

  const handleSave = async (values: ReadingListFormValues) => {
    if (dialogStatus === "saving") {
      return;
    }

    const trimmedProgress = values.progress.trim();
    const trimmedNotes = values.notes.trim();
    const ratingText = values.rating.trim();

    let ratingNumber: number | null = null;
    if (ratingText) {
      ratingNumber = Number.parseFloat(ratingText);
      if (!Number.isFinite(ratingNumber) || ratingNumber < 0 || ratingNumber > 10) {
        setDialogError("Rating must be between 0 and 10.");
        return;
      }
    }

    setDialogStatus("saving");
    setDialogError(null);

    try {
      const payload: Record<string, unknown> = { mangaId };
      if (trimmedProgress) {
        payload.progress = trimmedProgress;
      }
      if (ratingNumber !== null) {
        payload.rating = ratingNumber;
      }
      if (trimmedNotes) {
        payload.notes = trimmedNotes;
      }

      const response = await fetch("/api/reading-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        // ignore parse errors
      }

      const responseMessage =
        responseBody &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "message" in responseBody &&
        typeof (responseBody as Record<string, unknown>).message === "string"
          ? ((responseBody as Record<string, string>).message ?? undefined)
          : undefined;

      if (!response.ok) {
        setDialogStatus("idle");
        setDialogError(
          responseMessage ?? "Could not save this series to your reading list.",
        );
        return;
      }

      const nextSnapshot: ReadingListEntrySnapshot = {
        progress: trimmedProgress || null,
        rating: ratingNumber,
        notes: trimmedNotes || null,
      };

      setEntrySnapshot(nextSnapshot);
      setFormValues(toFormValues(nextSnapshot));
      setIsAdded(true);
      setDialogStatus("idle");
      setIsDialogOpen(false);
      setState("success");
      setMessage(responseMessage ?? "Saved to your reading list.");
      scheduleReset(true);
    } catch (error) {
      console.error("Failed to save reading list entry", error);
      setDialogStatus("idle");
      setDialogError("Network error while saving. Please try again.");
    }
  };

  const handleRemove = async () => {
    if (!isAdded || dialogStatus === "removing") {
      return;
    }

    setDialogStatus("removing");
    setDialogError(null);

    try {
      const response = await fetch("/api/reading-list", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mangaId }),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        // ignore parse errors
      }

      const responseMessage =
        responseBody &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "message" in responseBody &&
        typeof (responseBody as Record<string, unknown>).message === "string"
          ? ((responseBody as Record<string, string>).message ?? undefined)
          : undefined;

      if (!response.ok) {
        setDialogStatus("idle");
        setDialogError(
          responseMessage ?? "Could not remove this series from your reading list.",
        );
        return;
      }

      setEntrySnapshot(null);
      setFormValues(toFormValues(null));
      setIsAdded(false);
      setDialogStatus("idle");
      setIsDialogOpen(false);
      setState("success");
      setMessage(responseMessage ?? "Removed from your reading list.");
      scheduleReset(false);
    } catch (error) {
      console.error("Failed to remove reading list entry", error);
      setDialogStatus("idle");
      setDialogError("Network error while removing. Please try again.");
    }
  };

  const openDialog = () => {
    setFormValues(toFormValues(entrySnapshot));
    setDialogError(null);
    setMessage(null);
    setDialogStatus("idle");
    setIsDialogOpen(true);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition hover:-translate-y-0.5 hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {isAdded ? "Update reading list" : "Add to reading list"}
      </button>
      {message ? (
        <p
          className={`mt-2 text-xs ${
            state === "error" ? "text-red-300" : "text-accent"
          }`}
        >
          {message}
        </p>
      ) : null}
      {isDialogOpen
        ? createPortal(
            <ReadingListDialog
              values={formValues}
              setValues={setFormValues}
              onClose={() => setIsDialogOpen(false)}
              onSave={handleSave}
              onRemove={handleRemove}
              canRemove={isAdded}
              status={dialogStatus}
              error={dialogError}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

interface ReadingListDialogProps {
  values: ReadingListFormValues;
  setValues: Dispatch<SetStateAction<ReadingListFormValues>>;
  onClose: () => void;
  onSave: (values: ReadingListFormValues) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  canRemove: boolean;
  status: DialogStatus;
  error: string | null;
}

function ReadingListDialog({
  values,
  setValues,
  onClose,
  onSave,
  onRemove,
  canRemove,
  status,
  error,
}: ReadingListDialogProps) {
  const isSaving = status === "saving";
  const isRemoving = status === "removing";
  const [isVisible, setIsVisible] = useState(false);

  const requestClose = useCallback(() => {
    if (isSaving || isRemoving) {
      return;
    }
    setIsVisible(false);
    window.setTimeout(() => {
      onClose();
    }, 180);
  }, [isRemoving, isSaving, onClose]);


  useEffect(() => {
    const animation = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(animation);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
      onClick={requestClose}
      role="dialog"
      aria-modal
    >
      <div
        className={`w-full max-w-md rounded-3xl border border-white/15 bg-surface/95 p-6 text-white shadow-2xl transition-transform duration-200 ${isVisible ? "scale-100" : "scale-95"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold uppercase tracking-[0.2em]">Update reading list</h2>
        <p className="mt-1 text-sm text-white/70">
          Track your progress, rate the series, and jot down quick notes.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSave(values);
          }}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Progress
            </label>
            <input
              type="text"
              value={values.progress}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, progress: event.target.value }))
              }
              placeholder="e.g. Chapter 45"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={isSaving || isRemoving}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Rating (0 - 10)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={values.rating}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, rating: event.target.value }))
              }
              placeholder="8.5"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={isSaving || isRemoving}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Notes
            </label>
            <textarea
              rows={4}
              value={values.notes}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="Thoughts, favourite arcs, things to re-read..."
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={isSaving || isRemoving}
            />
          </div>

          {error ? <p className="text-xs text-red-300">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-accent bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || isRemoving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            {canRemove ? (
              <button
                type="button"
                onClick={async () => {
                  await onRemove();
                }}
                className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70 transition hover:border-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || isRemoving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



