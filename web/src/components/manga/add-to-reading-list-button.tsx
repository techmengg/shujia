"use client";

import Link from "next/link";
import { useState } from "react";

interface AddToReadingListButtonProps {
  mangaId: string;
  isAuthenticated: boolean;
  className?: string;
  initiallyAdded?: boolean;
}

type ActionState = "idle" | "saving" | "success" | "error";

export function AddToReadingListButton({
  mangaId,
  isAuthenticated,
  className,
  initiallyAdded = false,
}: AddToReadingListButtonProps) {
  const [isAdded, setIsAdded] = useState(initiallyAdded);
  const [state, setState] = useState<ActionState>(
    initiallyAdded ? "success" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

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

  const isSaving = state === "saving";

  const setIdle = () => {
    setState(isAdded ? "success" : "idle");
    setMessage(null);
  };

  const handleToggle = async () => {
    if (isSaving) {
      return;
    }

    setState("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/reading-list", {
        method: isAdded ? "DELETE" : "POST",
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
        setState("error");
        setMessage(
          responseMessage ??
            (isAdded
              ? "Could not remove this series from your reading list."
              : "Could not add this series to your reading list."),
        );
        return;
      }

      const nextAdded = !isAdded;
      setIsAdded(nextAdded);
      setState(nextAdded ? "success" : "idle");
      setMessage(
        responseMessage ??
          (nextAdded
            ? "Added to your reading list."
            : "Removed from your reading list."),
      );
    } catch (error) {
      console.error("Failed to toggle reading list status", error);
      setState("error");
      setMessage("Network error while updating your reading list.");
    } finally {
      window.setTimeout(() => {
        setIdle();
      }, 2400);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSaving}
        className={[
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          isSaving
            ? "cursor-progress border-white/20 text-white/50"
            : isAdded
              ? "border-accent/40 bg-accent/20 text-accent hover:-translate-y-0.5 hover:border-accent/60"
              : "border-accent text-accent hover:-translate-y-0.5 hover:border-white hover:text-white",
        ].join(" ")}
      >
        {isSaving
          ? "Saving..."
          : isAdded
            ? "Remove from list"
            : "Add to reading list"}
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
    </div>
  );
}
