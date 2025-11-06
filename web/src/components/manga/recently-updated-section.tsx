"use client";

import { useEffect, useRef, useState } from "react";

import type { MangaSummary } from "@/lib/mangadex/types";

import { MangaGrid } from "./manga-grid";

interface RecentlyUpdatedSectionProps {
  initialItems: MangaSummary[];
  pageSize?: number;
}

export function RecentlyUpdatedSection({
  initialItems,
  pageSize = 49,
}: RecentlyUpdatedSectionProps) {
  const [items, setItems] = useState<MangaSummary[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialItems.length >= pageSize);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState<number>(0);

  const handleLoadMore = async (limitOverride?: number) => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const limit = typeof limitOverride === "number" && limitOverride > 0 ? limitOverride : pageSize;
      const response = await fetch(
        `/api/manga/recent?limit=${limit}&offset=${items.length}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load more updates");
      }

      const payload = (await response.json()) as {
        data: MangaSummary[];
      };

      const incoming = payload.data ?? [];

      if (!incoming.length) {
        setHasMore(false);
        return;
      }

      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const deduped = incoming.filter((item) => !existingIds.has(item.id));

        if (!deduped.length) {
          setHasMore(false);
          return prev;
        }

        const nextItems = [...prev, ...deduped];

        if (deduped.length < limit) {
          setHasMore(false);
        }

        return nextItems;
      });
    } catch (error_) {
      console.error(error_);
      setError("Could not load more updates. Try again shortly.");
    } finally {
      setIsLoading(false);
    }
  };

  // Track column count based on container width to help fill full rows
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const compute = () => {
      const grid = el.querySelector('.grid') as HTMLElement | null;
      if (!grid) return;
      const first = grid.querySelector(':scope > *') as HTMLElement | null;
      const style = getComputedStyle(grid);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      if (first) {
        const colWidth = first.getBoundingClientRect().width || 1;
        const gridWidth = grid.clientWidth || el.clientWidth || 1;
        const count = Math.max(1, Math.floor((gridWidth + gap) / (colWidth + gap)));
        setColumns(count);
        return;
      }
      // Fallback: count template tracks when no children yet
      const template = style.gridTemplateColumns || '';
      const tokens = template.split(' ').filter(Boolean);
      if (tokens.length) {
        setColumns(tokens.length);
      }
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  // Auto-top-up to fill the last row before showing Load more
  useEffect(() => {
    if (!hasMore || isLoading) return;
    if (!columns || items.length === 0) return;
    const remainder = items.length % columns;
    if (remainder === 0) return;
    const needed = columns - remainder;
    // Fire and forget minimal fetch to complete the row
    void handleLoadMore(needed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, items.length, hasMore]);

  return (
    <div className="space-y-4" ref={gridRef}>
      <MangaGrid
        items={items}
        emptyState={
          <p className="rounded-2xl border border-white/15 bg-black p-6 text-sm text-surface-subtle text-center">
            Nothing new yet.
          </p>
        }
      />

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {hasMore ? (
        <button
          type="button"
          onClick={() => handleLoadMore()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
