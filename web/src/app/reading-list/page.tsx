"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { READING_LIST, type ReadingListItem } from "@/data/reading-list";

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
      return list.sort((a, b) => b.rating - a.rating);
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

export default function ReadingListPage() {
  const [sort, setSort] = useState<SortOption>("recent");
  const [randomKey, setRandomKey] = useState(0);

  const sortedItems = useMemo(
    () => sortReadingList(READING_LIST, sort, randomKey),
    [sort, randomKey],
  );

  const handleSortChange = (option: SortOption) => {
    if (option === "random") {
      setRandomKey((key) => key + 1);
    }
    setSort(option);
  };

  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-[-16rem] z-0 h-[32rem] bg-gradient-to-b from-accent/25 via-transparent to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-72 bg-gradient-to-t from-black/70 via-surface/40 to-transparent" />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:border-accent hover:text-white"
            >
              Home
            </Link>
            <span>→</span>
            <Link
              href="/profile"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:border-accent hover:text-white"
            >
              Profile
            </Link>
            <span>→</span>
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
                or shuffle for surprise picks—each entry carries personal notes,
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

        <section className="space-y-2">
          {sortedItems.map((item) => (
            <article
              key={item.id}
              className="flex items-stretch gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 transition hover:border-accent/40 sm:gap-4"
            >
              <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-accent-soft via-surface-muted to-surface shadow-[0_10px_24px_rgba(8,11,24,0.32)] sm:w-20">
                <Image
                  src={item.cover}
                  alt={item.title}
                  fill
                  priority={false}
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-white sm:text-base">
                      {item.title}
                    </h2>
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
                    {item.progress}
                  </p>
                  {item.notes ? (
                    <p className="max-w-3xl text-[0.75rem] text-white/70 line-clamp-2 sm:text-sm">
                      {item.notes}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex w-full max-w-[9rem] flex-col justify-between gap-1.5 text-[0.65rem] text-white/70 sm:w-36">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1">
                    <span className="text-[0.55rem] uppercase tracking-[0.2em] text-white/50">
                      Rating
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                      ★ {item.rating.toFixed(1)}
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
          ))}
        </section>
      </main>
    </div>
  );
}

