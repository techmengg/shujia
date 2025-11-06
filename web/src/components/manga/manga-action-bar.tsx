"use client";

import { useEffect, useState } from "react";

interface MangaActionBarProps {
  title: string;
  shareUrl: string;
}

type ShareStatus = "idle" | "copied" | "error";

export function MangaActionBar({ title, shareUrl }: MangaActionBarProps) {
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
    <div className="flex flex-col gap-2">
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white transition-colors active:scale-[0.98] hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        Search on Google
      </a>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition-colors active:scale-[0.98] hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {status === "copied" ? "Link copied" : "Share link"}
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
