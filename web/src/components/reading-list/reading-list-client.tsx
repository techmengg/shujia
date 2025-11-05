"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ReadingListItem, ReadingListResponse } from "@/data/reading-list";

type SortOption = "recent" | "alphabetical" | "rating" | "random";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "rating", label: "Rating" },
  { value: "random", label: "Random" },
];

function sortReadingList(items: ReadingListItem[], sort: SortOption, seed = 0) {
  const list = [...items];

  switch (sort) {
    case "alphabetical":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case "rating":
      return list.sort((a, b) => {
        const ratingB = typeof b.rating === "number" ? b.rating : Number.NEGATIVE_INFINITY;
        const ratingA = typeof a.rating === "number" ? a.rating : Number.NEGATIVE_INFINITY;
        return ratingB - ratingA;
      });
    case "random": {
      const shuffled = [...list];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const random = Math.abs(Math.sin((i + 1) * (seed || Math.random() + 1)));
        const j = Math.floor(random * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    case "recent":
    default:
      return list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

function formatUpdatedAt(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function ReadingListClient() {
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [sort, setSort] = useState<SortOption>("recent");
  const [randomKey, setRandomKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const loadReadingList = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/reading-list", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          if (!isSubscribed) return;
          setIsAuthenticated(false);
          setItems([]);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load your reading list.");
        }

        const payload = (await response.json()) as ReadingListResponse;

        if (!isSubscribed) return;

        setItems(payload.data ?? []);
        setIsAuthenticated(true);
      } catch (error_) {
        console.error("Failed to load reading list", error_);
        if (!isSubscribed) return;
        setError("Could not load your reading list. Try again shortly.");
        setIsAuthenticated((previous) =>
          previous === false ? previous : true,
        );
      } finally {
        if (!isSubscribed) return;
        setIsLoading(false);
      }
    };

    loadReadingList();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const sortedItems = useMemo(
    () => sortReadingList(items, sort, randomKey),
    [items, sort, randomKey],
  );

  const handleSortChange = (option: SortOption) => {
    if (option === "random") {
      setRandomKey((key) => key + 1);
    }
    setSort(option);
  };

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:border-accent hover:text-white"
          >
            Home
          </Link>
          <span>›</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
            Reading list
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              Curated Reading List
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              A living shelf of series worth bookmarking. Sort by recency, rating,
              or shuffle for surprise picks&#8212;each entry carries personal notes,
              progress, and genre cues.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
            <span>Sort:</span>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSortChange(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold transition ${
                    sort === option.value
                      ? "border-accent/60 bg-accent/20 text-accent"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-accent/40 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
              >
                <div className="h-24 w-16 shrink-0 rounded-lg bg-white/10" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-1/3 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : isAuthenticated === false ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
            Log in to manage your reading list.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">
            {error}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
            Your reading list is empty. Use the search bar to add a series.
          </div>
        ) : (
          sortedItems.map((item) => {
            const progressLabel =
              item.progress && item.progress.trim().length
                ? item.progress
                : "Not started yet";
            const ratingDisplay =
              typeof item.rating === "number" ? item.rating.toFixed(1) : "--";
            const tags = item.tags?.length ? item.tags : [];
            const titleInitial =
              item.title && item.title.trim().length
                ? item.title.trim().charAt(0).toUpperCase()
                : "?";

            return (
              <article
                key={item.id}
                className="flex items-stretch gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 transition hover:border-accent/40 sm:gap-4"
              >
                <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-accent-soft via-surface-muted to-surface shadow-[0_10px_24px_rgba(8,11,24,0.32)] sm:w-20">
                  {item.cover ? (
                    <Image
                      src={item.cover}
                      alt={item.title}
                      fill
                      priority={false}
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/40 text-lg font-semibold text-white">
                      {titleInitial}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1 space-y-1 sm:space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/manga/${item.mangaId}`}
                        className="text-sm font-semibold text-white transition hover:text-accent sm:text-base"
                      >
                        {item.title}
                      </Link>
                      {item.demographic ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/60">
                          {item.demographic}
                        </span>
                      ) : null}
                      {item.status ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/50">
                          {item.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[0.6rem] text-white/60 sm:text-[0.65rem]">
                      {progressLabel}
                    </p>
                    {item.notes ? (
                      <p className="max-w-3xl text-[0.75rem] text-white/70 line-clamp-2 sm:text-sm">
                        {item.notes}
                      </p>
                    ) : null}
                    {tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-white/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex w-full max-w-[9rem] flex-col justify-between gap-1.5 text-[0.65rem] text-white/70 sm:w-36">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1">
                      <span className="text-[0.55rem] uppercase tracking-[0.2em] text-white/50">
                        Rating
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                        * {ratingDisplay}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1">
                      <p className="text-[0.55rem] uppercase tracking-[0.2em] text-white/50">
                        Updated
                      </p>
                      <p className="text-[0.7rem] text-white/70">
                        {formatUpdatedAt(item.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
