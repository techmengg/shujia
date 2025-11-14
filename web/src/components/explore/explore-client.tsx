"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MangaGrid } from "@/components/manga/manga-grid";
import type { MangaSummary } from "@/lib/mangadex/types";

interface ExploreFilters {
  orderField: string;
  orderDirection: "asc" | "desc";
  contentRatings: string[];
  originalLanguages: string[];
  demographics: string[];
  statuses: string[];
}

interface ExploreResponse {
  data: MangaSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const DEFAULT_FILTERS: ExploreFilters = {
  orderField: "followedCount",
  orderDirection: "desc",
  contentRatings: ["safe", "suggestive"],
  originalLanguages: [],
  demographics: [],
  statuses: [],
};

export function ExploreClient() {
  const [mangas, setMangas] = useState<MangaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchMangas = useCallback(
    async (currentOffset: number, reset = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "30",
          offset: currentOffset.toString(),
          orderField: filters.orderField,
          orderDirection: filters.orderDirection,
        });

        filters.contentRatings.forEach((rating) =>
          params.append("contentRating[]", rating),
        );
        filters.originalLanguages.forEach((lang) =>
          params.append("originalLanguage[]", lang),
        );
        filters.demographics.forEach((demo) =>
          params.append("demographic[]", demo),
        );
        filters.statuses.forEach((status) =>
          params.append("status[]", status),
        );

        const response = await fetch(`/api/manga/explore?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch manga");

        const data: ExploreResponse = await response.json();

        setMangas((prev) => (reset ? data.data : [...prev, ...data.data]));
        setHasMore(data.hasMore);
        setOffset(currentOffset + data.data.length);
      } catch (error) {
        console.error("Failed to fetch manga:", error);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [filters],
  );

  // Initial load
  useEffect(() => {
    setMangas([]);
    setOffset(0);
    setHasMore(true);
    fetchMangas(0, true);
  }, [filters, fetchMangas]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          fetchMangas(offset);
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [offset, hasMore, fetchMangas]);

  const updateFilter = <K extends keyof ExploreFilters>(
    key: K,
    value: ExploreFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = <K extends keyof ExploreFilters>(
    key: K,
    value: string,
  ) => {
    setFilters((prev) => {
      const current = prev[key] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-6 pb-6 sm:px-6 lg:px-10 lg:pb-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Explore
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Discover manga from various sources
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:bg-black/40"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 space-y-4 rounded-lg border border-white/10 bg-black/30 p-4 sm:p-6">
          {/* Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "followedCount", label: "Most Followed" },
                { value: "latestUploadedChapter", label: "Latest Upload" },
                { value: "createdAt", label: "Recently Added" },
                { value: "year", label: "Year" },
                { value: "updatedAt", label: "Recently Updated" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFilter("orderField", option.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm transition ${
                    filters.orderField === option.value
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 bg-black/20 text-white/60 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Content Rating
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "safe", label: "Safe" },
                { value: "suggestive", label: "Suggestive" },
                { value: "erotica", label: "Erotica" },
                { value: "pornographic", label: "R-18" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    toggleArrayFilter("contentRatings", option.value)
                  }
                  className={`rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm transition ${
                    filters.contentRatings.includes(option.value)
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 bg-black/20 text-white/60 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Original Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Original Language
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ja", label: "Japanese" },
                { value: "ko", label: "Korean" },
                { value: "zh", label: "Chinese" },
                { value: "en", label: "English" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    toggleArrayFilter("originalLanguages", option.value)
                  }
                  className={`rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm transition ${
                    filters.originalLanguages.includes(option.value)
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 bg-black/20 text-white/60 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Demographic */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Demographic
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "shounen", label: "Shounen" },
                { value: "seinen", label: "Seinen" },
                { value: "shoujo", label: "Shoujo" },
                { value: "josei", label: "Josei" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleArrayFilter("demographics", option.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm transition ${
                    filters.demographics.includes(option.value)
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 bg-black/20 text-white/60 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ongoing", label: "Ongoing" },
                { value: "completed", label: "Completed" },
                { value: "hiatus", label: "Hiatus" },
                { value: "cancelled", label: "Cancelled" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleArrayFilter("statuses", option.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm transition ${
                    filters.statuses.includes(option.value)
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 bg-black/20 text-white/60 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-sm text-white/60 underline hover:text-white/80"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Manga Grid */}
      {mangas.length > 0 ? (
        <>
          <MangaGrid items={mangas} />

          {/* Loading indicator */}
          {loading && (
            <div className="mt-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
            </div>
          )}

          {/* Intersection observer target */}
          {hasMore && <div ref={observerTarget} className="h-20" />}

          {/* End message */}
          {!hasMore && mangas.length > 0 && (
            <p className="mt-8 text-center text-sm text-white/60">
              You&apos;ve reached the end
            </p>
          )}
        </>
      ) : loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
        </div>
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="rounded-lg border border-white/10 bg-black/30 p-8 text-center">
            <p className="text-white/60">No manga found with current filters</p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 text-sm text-white/80 underline hover:text-white"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

