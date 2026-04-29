"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { ReadingListItem } from "@/data/reading-list";
import type { MangaSummary } from "@/lib/manga/types";

interface RelinkDialogProps {
  entry: ReadingListItem;
  onClose: () => void;
  onSuccess: (newItem: ReadingListItem) => void;
}

interface SearchResponse {
  data: MangaSummary[];
}

const DEBOUNCE_DELAY = 300;

export function RelinkDialog({ entry, onClose, onSuccess }: RelinkDialogProps) {
  const [query, setQuery] = useState(entry.title);
  const [results, setResults] = useState<MangaSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/manga/search?q=${encodeURIComponent(trimmed)}&limit=20`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed.");
        const body = (await res.json()) as SearchResponse;
        setResults(body.data ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSearchError("Couldn't search right now.");
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  async function handleRelink(target: MangaSummary) {
    setSubmitting(target.id);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reading-list/relink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldEntryId: entry.id,
          newMangaId: target.id,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body?.message ?? "Couldn't relink.");
        setSubmitting(null);
        return;
      }
      onSuccess(body.data as ReadingListItem);
    } catch {
      setSubmitError("Couldn't relink.");
      setSubmitting(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Relink legacy entry"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 sm:py-16"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl border border-white/15 bg-surface">
        <div className="border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
                Relink legacy entry
              </p>
              <p className="truncate text-sm font-semibold text-white sm:text-base">
                {entry.title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-xs font-medium text-white/45 transition hover:text-white"
            >
              close
            </button>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-6">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search MangaUpdates"
            className="w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          {submitError ? (
            <p className="mt-2 text-[0.7rem] italic text-red-400 sm:text-xs">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="max-h-[60vh] overflow-y-auto border-t border-white/10">
          {isSearching ? (
            <p className="px-4 py-3 text-xs italic text-surface-subtle sm:px-6">
              Searching…
            </p>
          ) : searchError ? (
            <p className="px-4 py-3 text-xs italic text-red-400 sm:px-6">
              {searchError}
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs italic text-surface-subtle sm:px-6">
              {query.trim().length < 2
                ? "Type at least 2 characters."
                : "No matches. Try refining the search."}
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {results.map((r) => {
                const isBusy = submitting === r.id;
                const isDisabled = submitting !== null;
                return (
                  <li key={r.id} className="px-4 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden bg-white/5 sm:h-20 sm:w-14">
                        {r.coverImage ? (
                          <Image
                            src={r.coverImage}
                            alt={r.title}
                            fill
                            sizes="56px"
                            unoptimized
                            referrerPolicy="no-referrer"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/50">
                            {r.title.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="line-clamp-1 text-sm font-medium text-white sm:text-[0.95rem]">
                          {r.title}
                        </p>
                        <p className="line-clamp-1 text-[0.65rem] text-white/45 sm:text-xs">
                          {[r.year, r.status, r.demographic].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRelink(r)}
                          disabled={isDisabled}
                          className="group mt-1 inline-flex w-fit items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:text-white/25 sm:text-xs"
                        >
                          <span className="underline-offset-4 group-hover:underline group-disabled:no-underline">
                            {isBusy ? "relinking…" : "relink to this"}
                          </span>
                          {!isBusy ? (
                            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                              →
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
