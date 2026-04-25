"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const MAX_STARS = 5;

interface ReviewDialogProps {
  mangaId: string;
  provider: "mangadex" | "mangaupdates";
  initialRating: number | null; // 1-10 or null
  initialBody: string;
  initialHasSpoilers?: boolean;
  onClose: () => void;
  onSaved: (next: { rating: number; body: string | null; hasSpoilers: boolean }) => void;
  onDeleted: () => void;
}

function StarPicker({
  value,
  onChange,
}: {
  value: number; // 1-10
  onChange: (next: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const fillStars = Math.round((hovered ?? value) / 2); // 0-5

  return (
    <div className="flex items-baseline gap-1.5 text-3xl leading-none">
      {Array.from({ length: MAX_STARS }).map((_, i) => {
        const starIndex = i + 1;
        const dbValue = starIndex * 2; // 2,4,6,8,10
        const isFilled = starIndex <= fillStars;
        return (
          <button
            key={starIndex}
            type="button"
            onMouseEnter={() => setHovered(dbValue)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(dbValue)}
            className={[
              "bg-transparent p-0 transition-colors",
              isFilled ? "text-accent" : "text-surface-subtle/30 hover:text-surface-subtle",
            ].join(" ")}
            aria-label={`${starIndex} of ${MAX_STARS}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function ReviewDialog({
  mangaId,
  provider,
  initialRating,
  initialBody,
  initialHasSpoilers = false,
  onClose,
  onSaved,
  onDeleted,
}: ReviewDialogProps) {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [body, setBody] = useState<string>(initialBody);
  const [hasSpoilers, setHasSpoilers] = useState<boolean>(initialHasSpoilers);
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const requestClose = useCallback(() => {
    if (status !== "idle") return;
    setIsVisible(false);
    window.setTimeout(() => onClose(), 180);
  }, [onClose, status]);

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

  const handleSave = async () => {
    if (rating < 1 || rating > 10) {
      setError("Pick a rating from 1 to 5 stars.");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const trimmed = body.trim();
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId,
          provider,
          rating,
          body: trimmed.length > 0 ? trimmed : undefined,
          hasSpoilers,
        }),
      });

      if (!response.ok) {
        let message = "Could not save your review.";
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) message = payload.message;
        } catch {
          // ignore
        }
        setError(message);
        setStatus("idle");
        return;
      }

      onSaved({
        rating,
        body: trimmed.length > 0 ? trimmed : null,
        hasSpoilers,
      });
      setIsVisible(false);
      window.setTimeout(() => onClose(), 180);
    } catch (e) {
      console.error(e);
      setError("Network error while saving.");
      setStatus("idle");
    }
  };

  const handleDelete = async () => {
    setStatus("deleting");
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId, provider }),
      });
      if (!response.ok) {
        setError("Could not remove your review.");
        setStatus("idle");
        return;
      }
      onDeleted();
      setIsVisible(false);
      window.setTimeout(() => onClose(), 180);
    } catch (e) {
      console.error(e);
      setError("Network error while removing.");
      setStatus("idle");
    }
  };

  const isExisting = initialRating !== null;
  const isBusy = status !== "idle";

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={requestClose}
      role="dialog"
      aria-modal
    >
      <div
        className={[
          "w-full max-w-lg border border-white/15 bg-surface p-6 text-white transition-transform duration-200",
          isVisible ? "scale-100" : "scale-95",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {isExisting ? "Edit your review" : "Write a review"}
          </h2>
          <p className="text-xs text-surface-subtle">
            Your rating and review are public on this title&apos;s page.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-xs text-surface-subtle">Rating</label>
          <div className="flex items-baseline gap-3">
            <StarPicker value={rating} onChange={setRating} />
            <span className="text-sm text-surface-subtle">
              {rating > 0 ? `${rating / 2} / 5` : "tap a star"}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-xs text-surface-subtle">
            Review <span className="italic text-surface-subtle/60">(optional)</span>
          </label>
          <textarea
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What did you think? Spoilers go in their own toggle below."
            className="w-full border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-surface-subtle/60 focus:border-accent focus:outline-none"
            disabled={isBusy}
          />
        </div>

        <div className="mt-3">
          <label className="inline-flex items-baseline gap-2 text-xs text-surface-subtle">
            <input
              type="checkbox"
              checked={hasSpoilers}
              onChange={(event) => setHasSpoilers(event.target.checked)}
              disabled={isBusy}
            />
            <span>Contains spoilers</span>
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-xs text-red-300">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {isExisting ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
              className="bg-transparent p-0 text-xs font-medium text-red-300 transition-colors hover:text-red-200 disabled:cursor-default disabled:text-surface-subtle"
            >
              {status === "deleting" ? "removing…" : "delete review"}
            </button>
          ) : null}
          <div className="ml-auto flex items-baseline gap-4">
            <button
              type="button"
              onClick={requestClose}
              disabled={isBusy}
              className="bg-transparent p-0 text-xs font-medium text-surface-subtle transition-colors hover:text-white"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy || rating < 1}
              className="bg-transparent p-0 text-xs font-medium text-accent transition-colors hover:text-white disabled:cursor-default disabled:text-surface-subtle"
            >
              {status === "saving"
                ? "saving…"
                : isExisting
                  ? "save changes"
                  : "publish review"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
