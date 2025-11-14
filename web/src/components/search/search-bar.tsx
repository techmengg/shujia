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

import type { MangaSummary } from "@/lib/mangadex/types";
import { useAuth } from "@/components/auth/auth-provider";

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_DELAY = 200;
const OVERLAY_OFFSET_PX = 12;

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
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [actionStates, setActionStates] = useState<ReadingListActionStates>({});
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle click outside to close
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

  // Keyboard shortcut: Press "/" to focus search
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

  // Search functionality with debounce
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
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
          { signal: controller.signal }
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

  // Handle adding to reading list
  const handleAddToReadingList = useCallback(async (manga: MangaSummary) => {
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
        body: JSON.stringify({ mangaId: manga.id }),
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
          message: response.status === 409 ? "Already in your list." : "Added to your list.",
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
  }, [isAuthenticated]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
    } else if (e.key === "Escape") {
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  }, [results, selectedIndex]);

  const showOverlay = isFocused && (query.trim().length >= MIN_QUERY_LENGTH || isLoading);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setActionStates((previous) => {
      if (!results.length) return {};

      const next: ReadingListActionStates = {};
      for (const item of results) {
        if (previous[item.id]) {
          next[item.id] = previous[item.id];
        }
      }
      return next;
    });
  }, [results]);

  // Position overlay
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
        // Mobile: full width with margins
        setOverlayPosition({
          top: rect.bottom + OVERLAY_OFFSET_PX,
          left: 16,
          width: viewportWidth - 32,
        });
      } else {
        // Desktop: match search bar width and position
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

  const overlay =
    isMounted && showOverlay && overlayPosition
      ? createPortal(
          <div
            ref={overlayRef}
            className="fixed z-[200] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0A0E1A]/98 shadow-2xl backdrop-blur-xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/25 sm:max-h-[70vh] sm:rounded-3xl"
            style={{
              width: overlayPosition.width,
              left: overlayPosition.left,
              top: overlayPosition.top,
            }}
          >
            <div className="p-3 sm:p-4">
              {isLoading ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Searching...</span>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error ? (
                results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((manga, index) => {
                      const actionState = actionStates[manga.id] ?? { status: "idle" };
                      const isLoadingAction = actionState.status === "loading";
                      const isAdded = actionState.status === "added";
                      const helperMessage = actionState.message;
                      const isErrorState = actionState.status === "error";
                      const isSelected = index === selectedIndex;

                      const buttonLabel = (() => {
                        if (!isAuthenticated) return "Login";
                        if (isLoadingAction) return "...";
                        if (isAdded) return "✓";
                        return "+";
                      })();

                      const disableButton = isLoadingAction || (isAdded && isAuthenticated);

                      return (
                        <div key={manga.id} className="space-y-1">
                          <div
                            className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-all ${
                              isSelected
                                ? "border-accent/60 bg-accent/10 shadow-lg shadow-accent/20"
                                : "border-white/8 bg-white/5 hover:border-white/20 hover:bg-white/10"
                            }`}
                          >
                            <Link
                              href={`/manga/${manga.id}`}
                              className="flex flex-1 items-center gap-3 focus:outline-none"
                              tabIndex={-1}
                            >
                              {/* Cover Image */}
                              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 sm:h-18 sm:w-13">
                                {manga.coverImage ? (
                                  <Image
                                    fill
                                    src={manga.coverImage}
                                    alt={manga.title}
                                    sizes="52px"
                                    unoptimized
                                    className="object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/70">
                                    {manga.title.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                                  {manga.title}
                                </p>
                                {manga.altTitles.length > 0 && (
                                  <p className="line-clamp-1 text-xs text-white/50">
                                    {manga.altTitles[0]}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 text-[0.625rem] uppercase tracking-wider text-white/40">
                                  {manga.status && <span>{manga.status}</span>}
                                  {manga.demographic && <span>• {manga.demographic}</span>}
                                  {manga.year && <span>• {manga.year}</span>}
                                </div>
                              </div>
                            </Link>

                            {/* Add Button */}
                            <button
                              type="button"
                              onClick={() => handleAddToReadingList(manga)}
                              disabled={disableButton}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                                disableButton
                                  ? "cursor-not-allowed border-white/10 text-white/30"
                                  : "border-accent/50 text-accent hover:border-accent hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/30"
                              }`}
                              title={isAuthenticated ? "Add to reading list" : "Login to add"}
                            >
                              {buttonLabel}
                            </button>
                          </div>

                          {helperMessage && (
                            <p className={`pl-3 text-xs ${isErrorState ? "text-red-300" : "text-accent/80"}`}>
                              {helperMessage}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                    <p className="text-sm text-white/60">No results found</p>
                    <p className="mt-1 text-xs text-white/40">Try a different search term</p>
                  </div>
                )
              ) : null}
            </div>

            {/* Footer hint */}
            {results.length > 0 && !isLoading && (
              <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40">
                <span className="hidden sm:inline">Use ↑↓ to navigate, Enter to select, Esc to close</span>
                <span className="sm:hidden">Tap to select</span>
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="group relative flex w-full items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-r from-white/5 to-white/10 pl-3 pr-2 shadow-lg transition-all focus-within:border-accent/40 focus-within:from-white/10 focus-within:to-white/15 focus-within:shadow-xl focus-within:shadow-accent/20 hover:border-white/20 sm:pl-4 sm:pr-3">
          {/* Search Icon */}
          <div className="flex items-center text-white/50 transition-colors group-focus-within:text-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 sm:h-5 sm:w-5"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          {/* Input - 16px font size on mobile prevents zoom */}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search titles, tags, creators..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[16px] text-white placeholder:text-white/40 focus:outline-none sm:py-2.5 sm:text-sm"
            aria-label="Search manga"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Keyboard Shortcut Badge */}
          <kbd className="hidden items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[0.65rem] font-medium text-white/50 transition-colors group-focus-within:border-accent/30 group-focus-within:text-accent/70 sm:inline-flex">
            /
          </kbd>

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white sm:ml-2"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {overlay}
    </>
  );
}
