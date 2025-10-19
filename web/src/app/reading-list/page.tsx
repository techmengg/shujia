"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/layout/site-header";

type SortOption = "recent" | "alphabetical" | "rating" | "random";

interface ReadingListItem {
  id: string;
  title: string;
  cover: string;
  progress: string;
  rating: number;
  updatedAt: string;
  demographic?: string;
  status?: string;
  tags: string[];
  notes?: string;
}

const READING_LIST: ReadingListItem[] = [
  {
    id: "vinland-saga",
    title: "Vinland Saga",
    cover:
      "https://uploads.mangadex.org/covers/5d1fc77e-706a-4fc5-bea8-486c9be0145d/7fa60f5d-285a-40c5-8a1d-9cf375eaf897.jpg.512.jpg",
    progress: "201 / 201 chapters",
    rating: 9.7,
    updatedAt: "2025-05-18T10:00:00.000Z",
    demographic: "Seinen",
    status: "Completed",
    tags: ["Historical", "Adventure"],
    notes: "Definitive redemption arc with grounded brutality.",
  },
  {
    id: "blue-period",
    title: "Blue Period",
    cover:
      "https://uploads.mangadex.org/covers/f8e294c0-7c11-4c66-bdd7-4e25df52bf69/2dbc77be-3ce0-4945-b234-e9e94b15d905.jpg.512.jpg",
    progress: "Ongoing · Weekly",
    rating: 8.9,
    updatedAt: "2025-05-15T20:45:00.000Z",
    demographic: "Seinen",
    status: "Publishing",
    tags: ["Drama", "Art school"],
    notes: "Strong creative-growth journey with emotional stakes.",
  },
  {
    id: "oshi-no-ko",
    title: "Oshi no Ko",
    cover:
      "https://uploads.mangadex.org/covers/fa66c641-113f-4ae4-a83a-7dd77a7a10f8/b4b20a31-d0f5-4709-8d24-2aa7faa0e314.jpg.512.jpg",
    progress: "130 / 130 chapters",
    rating: 9.1,
    updatedAt: "2025-05-12T14:10:00.000Z",
    demographic: "Seinen",
    status: "Hiatus",
    tags: ["Idol industry", "Thriller"],
    notes: "Media-savvy mystery with razor-sharp commentary.",
  },
  {
    id: "frieren",
    title: "Frieren: Beyond Journey’s End",
    cover:
      "https://uploads.mangadex.org/covers/b0b721ff-c388-4486-aa0f-c2b0bb321512/f6fb40bf-f4e5-4163-a2c7-f103200873c3.jpg.512.jpg",
    progress: "118 / 118 chapters",
    rating: 9.3,
    updatedAt: "2025-05-11T09:30:00.000Z",
    demographic: "Shonen",
    status: "Ongoing",
    tags: ["Fantasy", "Slice of life"],
    notes: "Quiet post-adventure reflections with stunning atmosphere.",
  },
  {
    id: "kingdom",
    title: "Kingdom",
    cover:
      "https://uploads.mangadex.org/covers/1ef6ddce-7930-45ae-a335-9a45604b99f7/4269284c-7d26-41a8-86d5-48b64e17323d.jpg.512.jpg",
    progress: "780 / 780 chapters",
    rating: 9.5,
    updatedAt: "2025-05-17T06:50:00.000Z",
    demographic: "Seinen",
    status: "Ongoing",
    tags: ["Strategy", "War"],
    notes: "Relentless battlefield tactics and character politics.",
  },
  {
    id: "omniscient-reader",
    title: "Omniscient Reader",
    cover:
      "https://uploads.mangadex.org/covers/9a414441-bbad-43f1-a3a7-dc262ca790a3/be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg.512.jpg",
    progress: "176 / 176 chapters",
    rating: 9.0,
    updatedAt: "2025-05-19T02:05:00.000Z",
    demographic: "Seinen",
    status: "Completed",
    tags: ["Apocalypse", "Meta"],
    notes: "Fourth-wall storytelling done with heartfelt payoff.",
  },
  {
    id: "solo-leveling",
    title: "Solo Leveling",
    cover:
      "https://uploads.mangadex.org/covers/ade0306c-f4b6-4890-9edb-1ddf04df2039/fd49e2ad-69fc-416a-8deb-a71cc36b0b50.jpg.512.jpg",
    progress: "179 / 179 chapters",
    rating: 8.6,
    updatedAt: "2025-05-09T13:00:00.000Z",
    demographic: "Seinen",
    status: "Completed",
    tags: ["Action", "Power fantasy"],
    notes: "Cinematic set pieces with unstoppable protagonist energy.",
  },
  {
    id: "tower-of-god",
    title: "Tower of God",
    cover:
      "https://uploads.mangadex.org/covers/57e1d491-1dc9-4854-83bf-7a9379566fb2/5ed269d1-63af-45f8-8d67-4e8aa1e1b520.jpg.512.jpg",
    progress: "Season 3 · Ep. 148",
    rating: 8.8,
    updatedAt: "2025-05-16T22:40:00.000Z",
    demographic: "Shonen",
    status: "Ongoing",
    tags: ["Mystery", "Adventure"],
    notes: "Labyrinthine power systems with escalating stakes.",
  },
  {
    id: "the-breaker",
    title: "The Breaker",
    cover:
      "https://uploads.mangadex.org/covers/773c2211-750b-4fff-bd64-c914986e4637/cf60f76c-19fa-441f-b20d-9528180aaff7.jpg.512.jpg",
    progress: "200 / 200 chapters",
    rating: 8.7,
    updatedAt: "2025-05-05T12:20:00.000Z",
    demographic: "Seinen",
    status: "Completed",
    tags: ["Martial arts"],
    notes: "Speedy mentor-student brawls with classic pacing.",
  },
  {
    id: "lookism",
    title: "Lookism",
    cover:
      "https://uploads.mangadex.org/covers/596191eb-69ee-4401-983e-cc07e277fa17/6df15145-f15b-43f0-b87b-22fd3694eaca.jpg.512.jpg",
    progress: "469 / 469 chapters",
    rating: 8.4,
    updatedAt: "2025-05-14T11:35:00.000Z",
    demographic: "Shonen",
    status: "Ongoing",
    tags: ["Drama", "Social commentary"],
    notes: "Unflinching look at class and identity through chaos.",
  },
  {
    id: "ravages-of-time",
    title: "The Ravages of Time",
    cover:
      "https://uploads.mangadex.org/covers/f6ce20ca-73c3-4fdd-9367-e2901fca780e/20321227-0fb4-41cc-89b3-49f4a042bdcb.jpg.512.jpg",
    progress: "Ongoing · Monthly",
    rating: 9.2,
    updatedAt: "2025-05-10T04:15:00.000Z",
    demographic: "Seinen",
    status: "Ongoing",
    tags: ["Historical", "Strategy"],
    notes: "Three Kingdoms retelling with ruthless pragmatism.",
  },
  {
    id: "kings-avatar",
    title: "The King’s Avatar",
    cover:
      "https://uploads.mangadex.org/covers/1930d635-b170-417f-b8a8-f84b881bcc7d/93865b68-e5b4-4b42-a93a-b455af659b5f.jpg.512.jpg",
    progress: "172 / 172 chapters",
    rating: 8.8,
    updatedAt: "2025-05-13T18:25:00.000Z",
    demographic: "Shonen",
    status: "Completed",
    tags: ["Esports", "Drama"],
    notes: "Tactical team-building with grounded competitive stakes.",
  },
];

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

