"use client";

import { useState } from "react";

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

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/manga/recent?limit=${pageSize}&offset=${items.length}`,
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

        if (deduped.length < pageSize) {
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

  return (
    <div className="space-y-4">
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
          onClick={handleLoadMore}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
