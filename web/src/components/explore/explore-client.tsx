"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MangaGrid } from "@/components/manga/manga-grid";
import type { MangaSummary } from "@/lib/manga/types";

interface ExploreFilters {
  orderby: string;
  types: string[];
  genres: string[];
  year: string;
}

const DEFAULT_FILTERS: ExploreFilters = {
  orderby: "rating",
  types: [],
  genres: [],
  year: "",
};

const SORT_OPTIONS = [
  { value: "rating", label: "Top rated" },
  { value: "week_pos", label: "Trending (week)" },
  { value: "month1_pos", label: "Trending (month)" },
  { value: "year_pos", label: "Trending (year)" },
  { value: "date_added", label: "Recently added" },
];

const TYPE_OPTIONS = [
  { value: "Manga", label: "Manga (JP)" },
  { value: "Manhwa", label: "Manhwa (KR)" },
  { value: "Manhua", label: "Manhua (CN)" },
  { value: "OEL", label: "OEL (EN)" },
];

const GENRE_OPTIONS = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Thriller", "Tragedy",
];

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "border px-2.5 py-1 text-xs transition-colors sm:text-sm",
        active
          ? "border-white/30 text-white"
          : "border-white/10 text-surface-subtle hover:border-white/20 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function ExploreClient() {
  const [mangas, setMangas] = useState<MangaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchMangas = useCallback(
    async (currentPage: number, reset = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          perpage: "30",
          page: currentPage.toString(),
          orderby: filters.orderby,
        });
        if (filters.year) params.set("year", filters.year);
        filters.types.forEach((t) => params.append("type[]", t));
        filters.genres.forEach((g) => params.append("genre[]", g));

        const response = await fetch(`/api/manga/explore?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        setMangas((prev) => (reset ? data.data : [...prev, ...data.data]));
        setHasMore(data.hasMore);
        setPage(currentPage + 1);
      } catch (error) {
        console.error("Failed to fetch manga:", error);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    setMangas([]);
    setPage(1);
    setHasMore(true);
    fetchMangas(1, true);
  }, [filters, fetchMangas]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          fetchMangas(page);
        }
      },
      { threshold: 0.1 },
    );
    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [page, hasMore, fetchMangas]);

  const toggleArray = (key: "types" | "genres", value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-10">
      <div className="mb-4 flex items-baseline justify-between gap-2 sm:mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Explore
          </h1>
          <p className="mt-1 text-sm text-surface-subtle">
            Browse the most popular manga, manhwa, and manhua.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="shrink-0 bg-transparent p-0 text-xs font-medium text-accent transition-colors hover:text-white sm:text-sm"
        >
          {showFilters ? "hide filters" : "filters"}
        </button>
      </div>

      {showFilters ? (
        <div className="mb-6 space-y-4 border border-white/10 p-4 sm:p-5">
          <div className="space-y-2">
            <p className="text-xs text-surface-subtle">Sort by</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  active={filters.orderby === opt.value}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, orderby: opt.value }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-surface-subtle">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  active={filters.types.includes(opt.value)}
                  onClick={() => toggleArray("types", opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-surface-subtle">Genre</p>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => (
                <FilterChip
                  key={g}
                  label={g}
                  active={filters.genres.includes(g)}
                  onClick={() => toggleArray("genres", g)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-surface-subtle">Year</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 2024"
              value={filters.year}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                }))
              }
              className="w-24 border border-white/15 bg-transparent px-2.5 py-1.5 text-sm text-white placeholder:text-surface-subtle focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="bg-transparent p-0 text-xs text-surface-subtle transition-colors hover:text-white"
          >
            reset filters
          </button>
        </div>
      ) : null}

      {mangas.length > 0 ? (
        <>
          <MangaGrid items={mangas} />
          {loading ? (
            <p className="mt-6 text-center text-xs italic text-surface-subtle">
              Loading…
            </p>
          ) : null}
          {hasMore ? <div ref={observerTarget} className="h-20" /> : null}
          {!hasMore && mangas.length > 0 ? (
            <p className="mt-8 text-center text-xs italic text-surface-subtle">
              End of results.
            </p>
          ) : null}
        </>
      ) : loading ? (
        <p className="mt-16 text-center text-sm italic text-surface-subtle">
          Loading…
        </p>
      ) : (
        <p className="mt-16 text-center text-sm italic text-surface-subtle">
          No manga found with current filters.
        </p>
      )}
    </main>
  );
}
