"use client";

import { useEffect, useState } from "react";

interface MangaActionBarProps {
  mangaUrl: string;
  shareUrl: string;
}

type ShareStatus = "idle" | "copied" | "error";

export function MangaActionBar({ mangaUrl, shareUrl }: MangaActionBarProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ url: shareUrl });
        setStatus("copied");
        return;
      }
    } catch (shareError) {
      console.warn("System share failed, falling back to clipboard.", shareError);
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("copied");
      } else {
        setStatus("error");
      }
    } catch (clipboardError) {
      console.error("Unable to copy link", clipboardError);
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={mangaUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:-translate-y-0.5 hover:border-white"
      >
        View on MangaDex
      </a>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:-translate-y-0.5 hover:border-white"
      >
        Share link
      </button>
      {status === "copied" ? (
        <span className="text-xs text-accent">Link ready to share</span>
      ) : null}
      {status === "error" ? (
        <span className="text-xs text-red-300">Could not copy link</span>
      ) : null}
    </div>
  );
}
