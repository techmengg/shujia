"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MangaSummary } from "@/lib/manga/types";
import { useAuth } from "@/components/auth/auth-provider";

const DEBOUNCE_DELAY = 300;

interface SearchResponse {
  data: MangaSummary[];
  error?: string;
}

type ActionStatus = "idle" | "loading" | "added" | "error";
type ActionStates = Record<string, { status: ActionStatus; message?: string }>;

export function AddMangaSearch() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionStates, setActionStates] = useState<ActionStates>({});

  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      if (!trimmed) setHasSearched(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/manga/search?q=${encodeURIComponent(trimmed)}&limit=20`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed.");
        const payload = (await res.json()) as SearchResponse;
        if (payload.error) throw new Error(payload.error);
        setResults(payload.data);
        setHasSearched(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message ?? "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const handleAdd = useCallback(
    async (manga: MangaSummary) => {
      if (!isAuthenticated) return;

      setActionStates((prev) => ({
        ...prev,
        [manga.id]: { status: "loading" },
      }));

      try {
        const res = await fetch("/api/reading-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mangaId: manga.id, provider: manga.provider }),
        });

        let body: Record<string, unknown> = {};
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          // ignore
        }

        const msg =
          typeof body.message === "string" ? body.message : undefined;

        if (!res.ok && res.status !== 409) {
          setActionStates((prev) => ({
            ...prev,
            [manga.id]: {
              status: "error",
              message: msg ?? "Could not add.",
            },
          }));
          return;
        }

        setActionStates((prev) => ({
          ...prev,
          [manga.id]: {
            status: "added",
            message:
              res.status === 409 ? "Already in your list" : "Added",
          },
        }));
      } catch {
        setActionStates((prev) => ({
          ...prev,
          [manga.id]: { status: "error", message: "Network error." },
        }));
      }
    },
    [isAuthenticated],
  );

  return (
    <div>
      <div className="group flex w-full items-center border border-white/15 bg-white/[0.04] px-3 transition-colors focus-within:border-accent hover:border-white/25 sm:px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 shrink-0 text-surface-subtle transition-colors group-focus-within:text-accent sm:h-5 sm:w-5"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[16px] text-white placeholder:text-surface-subtle/60 focus:outline-none sm:py-3.5 sm:text-sm"
          aria-label="Search manga to add"
          autoComplete="off"
          spellCheck="false"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none text-surface-subtle transition-colors hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="mt-4 sm:mt-6">
        {isLoading ? (
          <p className="text-sm italic text-surface-subtle">Searching…</p>
        ) : null}

        {error ? (
          <p className="text-sm italic text-red-300">{error}</p>
        ) : null}

        {!isLoading && !error && hasSearched && results.length === 0 ? (
          <p className="text-sm italic text-surface-subtle">
            No results for &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : null}

        {results.length > 0 ? (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {results.map((manga) => {
              const action = actionStates[manga.id] ?? { status: "idle" };
              const meta: string[] = [];
              if (manga.status) meta.push(manga.status);
              if (manga.demographic) meta.push(manga.demographic);
              if (manga.year) meta.push(String(manga.year));

              return (
                <li key={manga.id} className="flex items-center gap-3 px-1 py-3 sm:gap-4 sm:px-2 sm:py-4">
                  <Link
                    href={`/manga/${manga.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
                  >
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden bg-white/5 sm:h-20 sm:w-14">
                      {manga.coverImage ? (
                        <Image
                          fill
                          src={manga.coverImage}
                          alt={manga.title}
                          sizes="56px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/60">
                          {manga.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="line-clamp-1 text-sm font-semibold text-white sm:text-[0.95rem]">
                        {manga.title}
                      </p>
                      {manga.altTitles[0] ? (
                        <p className="line-clamp-1 text-xs text-surface-subtle">
                          {manga.altTitles[0]}
                        </p>
                      ) : null}
                      {meta.length > 0 ? (
                        <p className="line-clamp-1 text-[0.7rem] text-surface-subtle/70 sm:text-xs">
                          {meta.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </Link>

                  <div className="shrink-0">
                    {!isAuthenticated ? (
                      <Link
                        href="/login?redirect=/add-manga"
                        className="text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
                      >
                        log in to add
                      </Link>
                    ) : action.status === "added" ? (
                      <span className="text-[0.7rem] text-surface-subtle sm:text-xs">
                        {action.message ?? "added"}
                      </span>
                    ) : action.status === "loading" ? (
                      <span className="text-[0.7rem] text-surface-subtle/70 sm:text-xs">
                        adding...
                      </span>
                    ) : action.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(manga)}
                        className="text-[0.7rem] font-medium text-red-300 transition-colors hover:text-white sm:text-xs"
                        title={action.message}
                      >
                        retry
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(manga)}
                        className="text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
                      >
                        + add to list
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
