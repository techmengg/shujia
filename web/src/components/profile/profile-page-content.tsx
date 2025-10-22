"use client";

import Image from "next/image";
import Link from "next/link";

const FALLBACK_AVATAR = "/noprofile.jpg";

interface ProfileUser {
  name: string | null;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  memberSince: string;
}

interface ReadingListEntryDto {
  id: string;
  mangaId: string;
  title: string;
  altTitles: string[];
  description: string | null;
  status: string | null;
  demographic: string | null;
  latestChapter: string | null;
  languages: string[];
  tags: string[];
  coverImage: string | null;
  url: string;
  progress: string | null;
  rating: number | null;
  notes: string | null;
  updatedAt: string;
}

interface ProfilePageContentProps {
  user: ProfileUser;
  readingList: ReadingListEntryDto[];
}

function formatMemberSince(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatUpdatedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizeStatus(status: string | null): "completed" | "in-progress" | "planned" | "unknown" {
  if (!status) return "unknown";
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("complete")) return "completed";
  if (normalized.includes("plan") || normalized.includes("queue")) return "planned";
  if (normalized.includes("reading") || normalized.includes("ongoing") || normalized.includes("current")) {
    return "in-progress";
  }
  return "unknown";
}

function groupByStatus(readingList: ReadingListEntryDto[]) {
  const groups: Record<string, ReadingListEntryDto[]> = {
    "In progress": [],
    Completed: [],
    "Plan to read": [],
    Other: [],
  };

  for (const entry of readingList) {
    const status = normalizeStatus(entry.status);
    if (status === "completed") {
      groups.Completed.push(entry);
    } else if (status === "in-progress") {
      groups["In progress"].push(entry);
    } else if (status === "planned") {
      groups["Plan to read"].push(entry);
    } else {
      groups.Other.push(entry);
    }
  }

  return groups;
}

function getTopTags(readingList: ReadingListEntryDto[], limit = 10) {
  const tagCounts = new Map<string, number>();
  for (const entry of readingList) {
    for (const tag of entry.tags) {
      const key = tag.trim();
      if (!key) continue;
      tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function ProfilePageContent({ user, readingList }: ProfilePageContentProps) {
  const memberSince = formatMemberSince(user.memberSince);
  const avatar = user.avatarUrl?.trim() ? user.avatarUrl : FALLBACK_AVATAR;
  const displayName = user.name?.trim() || user.email.split("@")[0];
  const bio = user.bio?.trim();

  const totalSeries = readingList.length;
  const completedCount = readingList.filter((entry) => normalizeStatus(entry.status) === "completed").length;
  const inProgressCount = readingList.filter((entry) => normalizeStatus(entry.status) === "in-progress").length;
  const plannedCount = readingList.filter((entry) => normalizeStatus(entry.status) === "planned").length;

  const ratings = readingList.map((entry) => entry.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length
    ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
    : null;

  const latestUpdates = readingList.slice(0, 6);
  const statusGroups = groupByStatus(readingList);
  const topTags = getTopTags(readingList);

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-black via-black to-accent/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35)_0%,_transparent_60%)] opacity-70" />
        <div className="relative flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:py-10">
          <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-white/20 bg-white/5 sm:h-32 sm:w-32">
            <Image
              src={avatar}
              alt={displayName ?? "Profile avatar"}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="space-y-4 text-white">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">{displayName}</h1>
              <p className="mt-1 text-sm text-white/70">{user.email}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/50">
                Member since {memberSince} · Timezone: {user.timezone || "UTC"}
              </p>
            </div>
            <p className="max-w-2xl text-sm text-white/75">
              {bio || "Add a short bio in settings to let the community know what keeps you turning pages."}
            </p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-white/55">
              <span className="rounded-full border border-white/25 px-3 py-1">Total series: {totalSeries}</span>
              <span className="rounded-full border border-white/25 px-3 py-1">Completed: {completedCount}</span>
              <span className="rounded-full border border-white/25 px-3 py-1">In progress: {inProgressCount}</span>
              <span className="rounded-full border border-white/25 px-3 py-1">Planned: {plannedCount}</span>
              {averageRating ? (
                <span className="rounded-full border border-white/25 px-3 py-1">Avg rating: {averageRating}</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
            Latest reading activity
          </h2>
          <Link
            href="/reading-list"
            className="text-xs uppercase tracking-[0.3em] text-surface-subtle transition hover:text-white"
          >
            View full shelf
          </Link>
        </div>
        {latestUpdates.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestUpdates.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-col gap-3 rounded-3xl border border-white/15 bg-black/80 p-4 transition hover:border-white/40"
              >
                <div className="flex gap-3">
                  <div className="relative h-28 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    {entry.coverImage ? (
                      <Image
                        src={entry.coverImage}
                        alt={entry.title}
                        fill
                        sizes="(min-width: 1024px) 120px, 80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/60">
                        {entry.title.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
                      {entry.altTitles.length ? (
                        <p className="text-xs text-white/55">{entry.altTitles[0]}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.2em] text-white/45">
                      {entry.status ? <span>{entry.status}</span> : null}
                      {entry.demographic ? <span>{entry.demographic}</span> : null}
                      <span>Updated {formatUpdatedAt(entry.updatedAt)}</span>
                    </div>
                    {entry.progress ? (
                      <p className="text-xs text-white/65">{entry.progress}</p>
                    ) : null}
                  </div>
                </div>
                {entry.notes ? (
                  <p className="text-sm text-white/70 line-clamp-3">{entry.notes}</p>
                ) : null}
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{entry.rating ? Rated  : "Not rated yet"}</span>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent transition hover:text-white"
                  >
                    Open on MangaDex
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/15 bg-black/70 p-6 text-center text-sm text-white/65">
            You haven&apos;t added anything to your reading list yet. Browse the latest titles and start tracking your shelf.
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/15 bg-black/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
                Shelf by status
              </h2>
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                {totalSeries} total entries
              </span>
            </div>
            <div className="mt-5 space-y-5">
              {Object.entries(statusGroups)
                .filter(([, items]) => items.length)
                .map(([label, items]) => (
                  <div key={label} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{label}</h3>
                      <span className="text-xs uppercase tracking-[0.3em] text-white/45">
                        {items.length} {items.length === 1 ? "series" : "series"}
                      </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-[220px] rounded-2xl border border-white/15 bg-white/5 p-3"
                        >
                          <p className="text-sm font-semibold text-white line-clamp-2">{item.title}</p>
                          {item.progress ? (
                            <p className="mt-1 text-xs text-white/65">{item.progress}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1 text-[0.6rem] uppercase tracking-[0.2em] text-white/45">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-full border border-white/15 px-2 py-0.5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-black/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
                Tag focus
              </h2>
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                {topTags.length} tracked tags
              </span>
            </div>
            {topTags.length ? (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {topTags.map(([tag, count]) => (
                  <li
                    key={tag}
                    className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-white">{tag}</span>
                    <span className="text-xs uppercase tracking-[0.25em] text-white/60">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-white/65">
                Tags will start appearing once you add series to your reading list.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/15 bg-black/80 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
              Quick actions
            </h2>
            <div className="mt-5 space-y-3">
              <Link
                href="/settings"
                className="block rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40"
              >
                Edit profile & preferences
              </Link>
              <Link
                href="/reading-list"
                className="block rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40"
              >
                Manage reading list
              </Link>
              <a
                href="https://mangadex.org/"
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40"
              >
                Discover new titles
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-black/80 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
              Activity summary
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li className="flex items-center justify-between">
                <span>Last update</span>
                <span className="text-white">
                  {readingList.length ? formatUpdatedAt(readingList[0].updatedAt) : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Most recent rating</span>
                <span className="text-white">
                  {readingList.find((entry) => typeof entry.rating === "number")?.rating?.toFixed(1) ?? "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Tracked languages</span>
                <span className="text-white">
                  {readingList
                    .reduce<string[]>((languages, entry) => {
                      for (const language of entry.languages) {
                        if (!languages.includes(language)) languages.push(language);
                      }
                      return languages;
                    }, [])
                    .join(", ") || "—"}
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
