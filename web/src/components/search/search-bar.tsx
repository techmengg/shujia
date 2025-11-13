"use client";

import Link from "next/link";
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
const MOBILE_HORIZONTAL_MARGIN_PX = 12;

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

import { useAuth } from "@/components/auth/auth-provider";

export function SearchBar() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [overlayPosition, setOverlayPosition] =
    useState<OverlayPosition | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [actionStates, setActionStates] = useState<ReadingListActionStates>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const queryTooShort = useMemo(
    () => query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH,
    [query],
  );

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      const container = containerRef.current;
      const overlayNode = overlayRef.current;

      if (
        (container &&
          (container === event.target || container.contains(event.target))) ||
        (overlayNode &&
          (overlayNode === event.target || overlayNode.contains(event.target)))
      ) {
        return;
      }

      setIsFocused(false);
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

  const handleAddToReadingList = async (manga: MangaSummary) => {
    if (!isAuthenticated) {
      setActionStates((prev) => ({
        ...prev,
        [manga.id]: {
          status: "error",
          message: "Log in to add series to your reading list.",
        },
      }));
      return;
    }

    setActionStates((prev) => ({
      ...prev,
      [manga.id]: {
        status: "loading",
      },
    }));

    try {
      const response = await fetch("/api/reading-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mangaId: manga.id,
        }),
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
        const errorMessage =
          responseMessage ?? "Could not save series to your reading list.";

        setActionStates((prev) => ({
          ...prev,
          [manga.id]: {
            status: "error",
            message: errorMessage,
          },
        }));
        return;
      }

      setActionStates((prev) => ({
        ...prev,
        [manga.id]: {
          status: "added",
          message: response.status === 409 ? "Already in your reading list." : "Added to your reading list.",
        },
      }));
    } catch (error_) {
      console.error("Failed to add to reading list", error_);
      setActionStates((prev) => ({
        ...prev,
        [manga.id]: {
          status: "error",
          message: "Network error while saving to your reading list.",
        },
      }));
    }
  };

  const showOverlay =
    isFocused &&
    (queryTooShort || query.trim().length >= MIN_QUERY_LENGTH || isLoading);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setActionStates((previous) => {
      if (!results.length) {
        return {};
      }

      const next: ReadingListActionStates = {};

      for (const item of results) {
        if (previous[item.id]) {
          next[item.id] = previous[item.id];
        }
      }

      return next;
    });
  }, [results]);

  useLayoutEffect(() => {
    if (!showOverlay) {
      setOverlayPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const isSmallViewport = viewportWidth < 640;
      const horizontalMargin = isSmallViewport ? MOBILE_HORIZONTAL_MARGIN_PX : 0;
      const calculatedWidth = isSmallViewport
        ? Math.max(200, viewportWidth - horizontalMargin * 2)
        : rect.width;
      const maxLeft = viewportWidth - calculatedWidth - horizontalMargin;
      const calculatedLeft = isSmallViewport
        ? Math.max(horizontalMargin, Math.min(rect.left, maxLeft))
        : rect.left;

      setOverlayPosition({
        top: rect.bottom + OVERLAY_OFFSET_PX,
        left: calculatedLeft,
        width: calculatedWidth,
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
            ref={overlayRef}
            className="fixed z-[200] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/15 bg-black/95 p-3 backdrop-blur-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 sm:rounded-3xl sm:p-4"
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
                  {results.map((manga) => {
                    const actionState = actionStates[manga.id] ?? {
                      status: "idle",
                    };
                    const isLoadingAction = actionState.status === "loading";
                    const isAdded = actionState.status === "added";
                    const helperMessage = actionState.message;
                    const isErrorState = actionState.status === "error";
                    const feedbackClass = isErrorState
                      ? "text-red-300"
                      : "text-accent";
                    const buttonLabel = (() => {
                      if (!isAuthenticated) {
                        return "Log in";
                      }
                      if (isLoadingAction) {
                        return "Saving...";
                      }
                      if (isAdded) {
                        return "Added";
                      }
                      return "Add";
                    })();
                    const disableButton =
                      isLoadingAction || (isAdded && isAuthenticated);

                    return (
                      <li key={manga.id} className="space-y-1">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/40 hover:bg-white/10">
                          <Link
                            href={`/manga/${manga.id}`}
                            className="flex flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                          >
                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-16 sm:w-12">
                              {manga.coverImage ? (
                                <Image
                                  fill
                                  src={manga.coverImage}
                                  alt={manga.title}
                                  sizes="48px"
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                                  {manga.title.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-left">
                              <p className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:truncate">
                                {manga.title}
                              </p>
                              {manga.altTitles.length > 0 ? (
                                <p className="text-xs text-surface-subtle/80">
                                  <span className="line-clamp-1 break-words sm:line-clamp-1">
                                    {manga.altTitles.join(" / ")}
                                  </span>
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.6rem] uppercase text-surface-subtle">
                                {manga.status ? <span className="truncate">{manga.status}</span> : null}
                                {manga.demographic ? (
                                  <span className="truncate">{manga.demographic}</span>
                                ) : null}
                                {manga.year ? <span className="whitespace-nowrap">{manga.year}</span> : null}
                              </div>
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleAddToReadingList(manga)}
                            disabled={disableButton}
                            className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                              disableButton
                                ? "cursor-not-allowed border-white/15 text-white/40"
                                : "border-accent text-accent hover:border-white hover:text-white"
                            }`}
                          >
                            {buttonLabel}
                          </button>
                        </div>
                        {helperMessage ? (
                          <p className={`pl-1 text-xs ${feedbackClass}`}>
                            {helperMessage}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
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
        <div className="group relative flex w-full items-center overflow-hidden rounded-full bg-white/5 pl-3 pr-2 shadow-[0_6px_20px_rgba(2,6,23,0.35)] transition focus-within:bg-white/10 sm:pl-4 sm:pr-3">
          <div className="flex items-center text-surface-subtle transition group-focus-within:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4 sm:h-5 sm:w-5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A6 6 0 1010.65 6.3a6 6 0 006 10.35z"
              />
            </svg>
          </div>
          <input
            type="search"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titles, tags, creators..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none sm:py-2.5"
            aria-label="Search MangaDex titles"
          />
          <kbd className="hidden rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.65rem] text-surface-subtle sm:inline-flex">
            /
          </kbd>
        </div>
      </div>
      {overlay}
    </>
  );
}
