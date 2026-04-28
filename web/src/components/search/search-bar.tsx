"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { MangaSummary } from "@/lib/manga/types";
import { useAuth } from "@/components/auth/auth-provider";

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_DELAY = 200;
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

type ReadingListActionState = {
  status: "idle" | "loading" | "added" | "error";
  message?: string;
};

type ReadingListActionStates = Record<string, ReadingListActionState>;

export function SearchBar() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);
  const [actionStates, setActionStates] = useState<ReadingListActionStates>({});
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      const container = containerRef.current;
      const overlayNode = overlayRef.current;

      if (
        (container && (container === event.target || container.contains(event.target))) ||
        (overlayNode && (overlayNode === event.target || overlayNode.contains(event.target)))
      ) {
        return;
      }

      setIsFocused(false);
      setSelectedIndex(-1);
    };

    window.addEventListener("mousedown", handleClickAway);
    return () => window.removeEventListener("mousedown", handleClickAway);
  }, []);

  // Global "/" shortcut to focus the field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isFocused && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setSelectedIndex(-1);

      try {
        const response = await fetch(
          `/api/manga/search?q=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal },
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
        if ((error_ as Error).name === "AbortError") return;
        setError((error_ as Error).message ?? "Something went wrong while searching.");
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  // Add-to-list (provider-aware)
  const handleAddToReadingList = useCallback(
    async (manga: MangaSummary) => {
      if (!isAuthenticated) {
        setActionStates((prev) => ({
          ...prev,
          [manga.id]: {
            status: "error",
            message: "Log in to add to your reading list.",
          },
        }));
        return;
      }

      setActionStates((prev) => ({
        ...prev,
        [manga.id]: { status: "loading" },
      }));

      try {
        const response = await fetch("/api/reading-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mangaId: manga.id, provider: manga.provider }),
        });

        let responseBody: unknown = null;
        try {
          responseBody = await response.json();
        } catch (parseError) {
          console.warn("Could not parse reading list response", parseError);
        }

        const responseMessage =
          responseBody &&
          typeof responseBody === "object" &&
          responseBody !== null &&
          "message" in responseBody &&
          typeof (responseBody as Record<string, unknown>).message === "string"
            ? ((responseBody as Record<string, string>).message ?? undefined)
            : undefined;

        if (!response.ok && response.status !== 409) {
          const errorMessage = responseMessage ?? "Could not save to your reading list.";
          setActionStates((prev) => ({
            ...prev,
            [manga.id]: { status: "error", message: errorMessage },
          }));
          return;
        }

        setActionStates((prev) => ({
          ...prev,
          [manga.id]: {
            status: "added",
            message:
              response.status === 409 ? "Already in your list." : "Added to your list.",
          },
        }));
      } catch (error_) {
        console.error("Failed to add to reading list", error_);
        setActionStates((prev) => ({
          ...prev,
          [manga.id]: {
            status: "error",
            message: "Network error.",
          },
        }));
      }
    },
    [isAuthenticated],
  );

  // Keyboard nav inside the input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFocused(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        return;
      }

      if (!results.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const selectedManga = results[selectedIndex];
        if (selectedManga) {
          window.location.href = `/manga/${selectedManga.id}`;
        }
      }
    },
    [results, selectedIndex],
  );

  const showOverlay =
    isFocused && (query.trim().length >= MIN_QUERY_LENGTH || isLoading);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setActionStates((previous) => {
      if (!results.length) return {};
      const next: ReadingListActionStates = {};
      for (const item of results) {
        if (previous[item.id]) next[item.id] = previous[item.id];
      }
      return next;
    });
  }, [results]);

  // Position the overlay relative to the input
  useLayoutEffect(() => {
    if (!showOverlay) {
      setOverlayPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640;

      if (isMobile) {
        setOverlayPosition({
          top: rect.bottom + OVERLAY_OFFSET_PX,
          left: 12,
          width: viewportWidth - 24,
        });
      } else {
        setOverlayPosition({
          top: rect.bottom + OVERLAY_OFFSET_PX,
          left: rect.left,
          width: rect.width,
        });
      }
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

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const showEmptyState = !isLoading && !error && hasQuery && results.length === 0;

  const overlay =
    isMounted && showOverlay && overlayPosition
      ? createPortal(
          <div
            ref={overlayRef}
            className="fixed z-[200] max-h-[calc(100vh-120px)] overflow-y-auto border border-white/15 bg-surface/95 backdrop-blur sm:max-h-[70vh]"
            style={{
              width: overlayPosition.width,
              left: overlayPosition.left,
              top: overlayPosition.top,
            }}
          >
            {isLoading ? (
              <p className="px-3 py-2 text-xs italic text-surface-subtle sm:px-4">
                Searching…
              </p>
            ) : null}

            {error ? (
              <p className="border-b border-red-400/30 px-3 py-2 text-xs italic text-red-200 sm:px-4">
                {error}
              </p>
            ) : null}

            {showEmptyState ? (
              <p className="px-3 py-2.5 text-xs italic text-surface-subtle sm:px-4">
                No results for &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : null}

            {results.length > 0 ? (
              <ul className="divide-y divide-white/10">
                {results.map((manga, index) => {
                  const actionState = actionStates[manga.id] ?? { status: "idle" };
                  const isLoadingAction = actionState.status === "loading";
                  const isAdded = actionState.status === "added";
                  const isErrorState = actionState.status === "error";
                  const helperMessage = actionState.message;
                  const isSelected = index === selectedIndex;

                  const metaBits: string[] = [];
                  if (manga.status) metaBits.push(manga.status);
                  if (manga.demographic) metaBits.push(manga.demographic);
                  if (manga.year) metaBits.push(String(manga.year));

                  return (
                    <li
                      key={manga.id}
                      className={`relative transition-colors ${
                        isSelected
                          ? "bg-accent-soft/40 before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-accent"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4">
                        <Link
                          href={`/manga/${manga.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2.5 focus:outline-none sm:gap-3"
                          tabIndex={-1}
                        >
                          <div className="relative h-10 w-7 shrink-0 overflow-hidden sm:h-11 sm:w-8">
                            {manga.coverImage ? (
                              <Image
                                fill
                                src={manga.coverImage}
                                alt={manga.title}
                                sizes="32px"
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center border border-white/10 text-xs font-semibold text-white/60">
                                {manga.title.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-0">
                            <p className="line-clamp-1 text-sm font-medium text-white">
                              {manga.title}
                            </p>
                            {metaBits.length > 0 ? (
                              <p className="line-clamp-1 text-[0.65rem] text-surface-subtle/80 sm:text-[0.7rem]">
                                {metaBits.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        </Link>

                        {isAuthenticated ? (
                          <button
                            type="button"
                            onClick={() => handleAddToReadingList(manga)}
                            disabled={isLoadingAction || isAdded}
                            className={[
                              "shrink-0 bg-transparent p-0 text-[0.65rem] font-medium transition-colors sm:text-[0.7rem]",
                              isAdded
                                ? "text-surface-subtle"
                                : isLoadingAction
                                  ? "text-surface-subtle/70"
                                  : "text-accent hover:text-white",
                            ].join(" ")}
                          >
                            {isLoadingAction
                              ? "adding…"
                              : isAdded
                                ? "✓ added"
                                : "+ add"}
                          </button>
                        ) : (
                          <Link
                            href="/login?redirect=/"
                            className="shrink-0 text-[0.65rem] font-medium text-accent transition-colors hover:text-white sm:text-[0.7rem]"
                          >
                            log in →
                          </Link>
                        )}
                      </div>

                      {helperMessage ? (
                        <p
                          className={`px-3 pb-1.5 text-[0.65rem] italic sm:px-4 ${
                            isErrorState ? "text-red-300" : "text-surface-subtle"
                          }`}
                        >
                          {helperMessage}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {results.length > 0 ? (
              <div className="border-t border-white/10 px-3 py-1.5 text-[0.6rem] text-surface-subtle/70 sm:px-4 sm:text-[0.65rem]">
                <span className="hidden sm:inline">
                  ↑↓ navigate · enter open · esc close
                </span>
                <span className="sm:hidden">Tap to open</span>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="group flex w-full items-center border border-white/15 px-2.5 transition-colors focus-within:border-accent hover:border-white/25 sm:px-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 shrink-0 text-surface-subtle transition-colors group-focus-within:text-accent sm:h-[18px] sm:w-[18px]"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search titles, tags, creators…"
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-[16px] text-white placeholder:text-surface-subtle/60 focus:outline-none sm:py-2 sm:text-sm"
            aria-label="Search manga"
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
          ) : (
            <span
              aria-hidden
              className="hidden shrink-0 select-none font-mono text-[0.7rem] text-surface-subtle/50 sm:inline"
            >
              /
            </span>
          )}
        </div>
      </div>
      {overlay}
    </>
  );
}
