"use client";

import { useEffect, useRef, useState } from "react";

import type { MangaSummary } from "@/lib/mangaupdates/types";

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!hasMore) {
      observerRef.current?.disconnect();
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "120px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

      <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
      {isLoading ? (
        <div className="flex justify-center">
          <span className="text-sm text-white/60">Loading…</span>
        </div>
      ) : null}
      {!isLoading && !hasMore ? (
        <p className="text-center text-sm text-white/40">You’re all caught up.</p>
      ) : null}
    </div>
  );
}
