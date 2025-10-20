"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { MangaSummary } from "@/lib/mangadex/types";

const MIN_QUERY_LENGTH = 3;
const OVERLAY_OFFSET_PX = 8;

interface SearchResponse {
  data: MangaSummary[];
  error?: string;
  message?: string;
}

interface OverlayPosition {
  top: number;
  left: number;
  width: number;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [overlayPosition, setOverlayPosition] =
    useState<OverlayPosition | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const queryTooShort = useMemo(
    () => query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH,
    [query],
  );

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsFocused(false);
      }
    };

    window.addEventListener("mousedown", handleClickAway);
    return () => window.removeEventListener("mousedown", handleClickAway);
  }, []);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/manga/search?q=${encodeURIComponent(query)}&limit=8`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch search results.");
        }

        const payload = (await response.json()) as SearchResponse;

        if (payload.error) {
          throw new Error(payload.error);
        }

        setResults(payload.data);
      } catch (error_) {
        if ((error_ as Error).name === "AbortError") {
          return;
        }

        setError(
          (error_ as Error).message ??
            "Something went wrong while searching MangaDex.",
        );
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const showOverlay =
    isFocused &&
    (queryTooShort || query.trim().length >= MIN_QUERY_LENGTH || isLoading);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!showOverlay) {
      setOverlayPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setOverlayPosition({
        top: rect.bottom + OVERLAY_OFFSET_PX,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    const scrollOptions: AddEventListenerOptions = { passive: true };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, scrollOptions);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, scrollOptions);
    };
  }, [showOverlay]);

  const overlay =
    isMounted && showOverlay && overlayPosition
      ? createPortal(
          <div
            className="fixed z-[200] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/15 bg-black/95 p-3 sm:rounded-3xl sm:p-4"
            style={{
              width: overlayPosition.width,
              left: overlayPosition.left,
              top: overlayPosition.top,
            }}
          >
            {queryTooShort ? (
              <p className="text-xs text-surface-subtle text-center sm:text-left">
                Type at least {MIN_QUERY_LENGTH} characters to search MangaDex.
              </p>
            ) : null}

            {isLoading ? (
              <div className="mt-2 animate-pulse space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-surface-subtle">
                Searching...
              </div>
            ) : null}

            {error ? (
              <div className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {!isLoading && !error && !queryTooShort ? (
              results.length > 0 ? (
                <ul className="mt-1 space-y-2">
                  {results.map((manga) => (
                    <li key={manga.id}>
                      <a
                        href={manga.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 transition hover:border-white/60 hover:bg-white/10"
                      >
                        <div className="relative h-14 w-10 overflow-hidden rounded-xl bg-white/5 sm:h-16 sm:w-12">
                          {manga.coverImage ? (
                            <Image
                              fill
                              src={manga.coverImage}
                              alt={manga.title}
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                              {manga.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col overflow-hidden text-left">
                          <p className="truncate text-sm font-semibold text-white">
                            {manga.title}
                          </p>
                          {manga.altTitles.length > 0 ? (
                            <p className="truncate text-xs text-surface-subtle/80">
                              {manga.altTitles.join(" / ")}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase text-surface-subtle">
                            {manga.status ? <span>{manga.status}</span> : null}
                            {manga.demographic ? (
                              <span>{manga.demographic}</span>
                            ) : null}
                            {manga.year ? <span>{manga.year}</span> : null}
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-surface-subtle">
                  No results found. Try a different title or refine your query.
                </p>
              )
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="group flex w-full items-center rounded-xl border border-white/20 bg-transparent px-3 py-2.5 transition focus-within:border-white sm:rounded-2xl sm:px-3.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5 text-surface-subtle transition group-focus-within:text-white"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A6 6 0 1010.65 6.3a6 6 0 006 10.35z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search series..."
            className="w-full bg-transparent pl-3 text-sm text-white placeholder:text-surface-subtle focus:outline-none"
            aria-label="Search MangaDex titles"
          />
          <kbd className="hidden rounded-lg border border-white/15 bg-transparent px-2 py-1 text-[0.65rem] text-surface-subtle sm:inline-flex">
            /
          </kbd>
        </div>
      </div>
      {overlay}
    </>
  );
}
