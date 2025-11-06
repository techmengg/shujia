"use client";

import Image from "next/image";
import Link from "next/link";

const FALLBACK_AVATAR = "/noprofile.jpg";

interface ProfileUser {
  name: string | null;
  email: string;
  username: string | null;
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
  isOwner: boolean;
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
  if (
    normalized.includes("reading") ||
    normalized.includes("ongoing") ||
    normalized.includes("current")
  ) {
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
  const bio = user.bio?.trim();

  const totalSeries = readingList.length;
  const completedCount = readingList.filter(
    (entry) => normalizeStatus(entry.status) === "completed",
  ).length;
  const inProgressCount = readingList.filter(
    (entry) => normalizeStatus(entry.status) === "in-progress",
  ).length;
  const plannedCount = readingList.filter(
    (entry) => normalizeStatus(entry.status) === "planned",
  ).length;

  const ratings = readingList
    .map((entry) => entry.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length
    ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
    : null;

  const latestUpdates = readingList.slice(0, 3);
  const ratedTens = readingList.filter((entry) => typeof entry.rating === "number" && entry.rating === 10);
  const statusGroups = groupByStatus(readingList);
  const topTags = getTopTags(readingList);

  const mostRecentRating =
    readingList.find((entry) => typeof entry.rating === "number")?.rating ?? null;
  const lastUpdatedDisplay = readingList.length ? formatUpdatedAt(readingList[0].updatedAt) : "-";

  const languageSet = new Set<string>();
  for (const entry of readingList) {
    for (const language of entry.languages) {
      const trimmed = language.trim();
      if (trimmed) {
        languageSet.add(trimmed);
      }
    }
  }
  const languagesLabel = languageSet.size ? Array.from(languageSet).join(", ") : "-";
  const hasStatusData = Object.values(statusGroups).some((items) => items.length > 0);

  const usernameLabel = user.username ? `@${user.username}` : null;
  const displayName =
    user.name?.trim() ||
    usernameLabel ||
    user.email;

  function escapeHtml(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function markdownBioToHtml(raw?: string | null): string | null {
    if (!raw) return null;
    const escaped = escapeHtml(raw);
    let html = escaped.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-accent hover:text-white">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1<\/em>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-12 pt-10 sm:space-y-10 sm:px-6 lg:px-10">
      <section className="space-y-5 border-b border-white/10 pb-5 sm:space-y-6 sm:pb-7">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="flex shrink-0 flex-col items-start">
            <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-[0_20px_40px_rgba(8,11,24,0.4)] sm:h-36 sm:w-36">
              <Image
                src={avatar}
                alt={`${displayName} avatar`}
                fill
                priority
                sizes="(min-width: 640px) 180px, 128px"
                quality={100}
                unoptimized
                className="object-cover"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">{displayName}</h1>
              {usernameLabel ? (
                <p className="text-sm text-white/60">{usernameLabel}</p>
              ) : null}
              {/* Email hidden from profile view */}
              <p className="text-sm text-white/45">
                Member since {memberSince} | {user.timezone || "UTC"}
              </p>
            </div>
            {bio ? (
              <div
                className="hidden text-sm text-white/65 sm:block sm:max-w-2xl"
                dangerouslySetInnerHTML={{ __html: markdownBioToHtml(bio) ?? "" }}
              />
            ) : (
              <p className="hidden text-sm text-white/65 sm:block sm:max-w-2xl">
                {"Add a short bio in settings to share what keeps you turning pages."}
              </p>
            )}
            {/* Stats moved below bio for better mobile flow */}
          </div>
        </div>
        {/* Mobile bio below avatar + text */}
        {bio ? (
          <div
            className="text-sm text-white/65 sm:hidden"
            dangerouslySetInnerHTML={{ __html: markdownBioToHtml(bio) ?? "" }}
          />
        ) : (
          <p className="text-sm text-white/65 sm:hidden">
            {"Add a short bio in settings to share what keeps you turning pages."}
          </p>
        )}
        {/* Stats below bio (all breakpoints) */}
        <ul className="mt-2 flex flex-nowrap items-center gap-x-3 overflow-x-auto text-xs text-white/60 scrollbar-none sm:mt-0 sm:gap-x-6 sm:text-sm">
          <li className="whitespace-nowrap">
            <span className="text-white/75">Total series:</span> {totalSeries}
          </li>
          <li className="whitespace-nowrap">
            <span className="text-white/75">Completed:</span> {completedCount}
          </li>
          <li className="whitespace-nowrap">
            <span className="text-white/75">In progress:</span> {inProgressCount}
          </li>
          <li className="whitespace-nowrap">
            <span className="text-white/75">Planned:</span> {plannedCount}
          </li>
          {averageRating ? (
            <li className="whitespace-nowrap">
              <span className="text-white/75">Average rating:</span> {averageRating}
            </li>
          ) : null}
        </ul>
      </section>

      {ratedTens.length ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Rated 10</h2>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
            {ratedTens.slice(0, 8).map((item) => (
              <li key={item.id} className="min-w-0">
                <Link href={`/manga/${item.mangaId}`} className="block">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/5">
                    {item.coverImage ? (
                      <Image
                        src={item.coverImage}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 12.5vw, (min-width: 640px) 12.5vw, 12.5vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/70">
                        {item.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-center text-[0.55rem] text-white/70 sm:text-[0.6rem]">
                    {item.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white sm:text-base">Latest reading activity</h2>
          <Link href="/reading-list" className="text-xs text-accent transition hover:text-white sm:text-sm">
            View reading list
          </Link>
        </header>
        {latestUpdates.length ? (
          <ul className="space-y-3 sm:space-y-4">
            {latestUpdates.map((entry) => (
              <li
                key={entry.id}
                className="flex gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0 sm:gap-4 sm:pb-4"
              >
                <div className="relative h-20 w-14 overflow-hidden rounded-xl bg-white/5 sm:h-24 sm:w-16">
                  {entry.coverImage ? (
                    <Image
                      src={entry.coverImage}
                      alt={entry.title}
                      fill
                      sizes="(min-width: 768px) 96px, 64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/50">
                      {entry.title.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-white sm:text-sm">{entry.title}</h3>
                    {entry.altTitles.length ? (
                      <p className="text-[0.7rem] text-white/55 sm:text-xs">{entry.altTitles[0]}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[0.7rem] text-white/50 sm:text-xs">
                    {entry.status ? <span>{entry.status}</span> : null}
                    {entry.demographic ? <span>{entry.demographic}</span> : null}
                    <span>Updated {formatUpdatedAt(entry.updatedAt)}</span>
                  </div>
                  {entry.progress ? (
                    <p className="text-[0.7rem] text-white/65 sm:text-xs">{entry.progress}</p>
                  ) : null}
                  {entry.notes ? (
                    <p className="text-xs text-white/65 line-clamp-3 sm:text-sm">{entry.notes}</p>
                  ) : null}
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>
                      {typeof entry.rating === "number"
                        ? `Rated ${entry.rating.toFixed(1)}`
                        : "Not rated yet"}
                    </span>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent transition hover:text-white"
                    >
                      Open on MangaDex
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-white/60">
            You have not logged any reading activity yet. Browse the latest titles and start tracking
            your shelf.
          </p>
        )}
      </section>

      <section className="space-y-5 border-t border-white/10 pt-8 sm:space-y-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-white sm:text-base">Library overview</h2>
          <p className="text-xs text-white/60 sm:text-sm">A snapshot of how your series are organised.</p>
        </header>

        {hasStatusData ? (
          <div className="space-y-5 sm:space-y-6">
            {Object.entries(statusGroups)
              .filter(([, items]) => items.length)
              .map(([label, items]) => {
                const visibleItems = items.slice(0, 5);
                const remaining = items.length - visibleItems.length;

                return (
                  <div key={label} className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{label}</span>
                      <span className="text-white/50">
                        {items.length} title{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {visibleItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-white/65 sm:gap-x-3 sm:text-sm"
                        >
                          <span className="flex-1 truncate font-medium text-white">{item.title}</span>
                          {item.progress ? (
                            <span className="text-white/45">{item.progress}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {remaining > 0 ? (
                      <p className="text-[0.7rem] text-white/40 sm:text-xs">+ {remaining} more in this list</p>
                    ) : null}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-white/60 sm:text-sm">Start tracking series to see them grouped here.</p>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Top tags</h3>
          {topTags.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-white/70 sm:text-sm">
              {topTags.map(([tag, count]) => (
                <span key={tag} className="rounded-md border border-white/15 px-3 py-1">
                  {tag}
                  <span className="ml-2 text-white/40">{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/60 sm:text-sm">
              Tags will appear once you add a few more series to your list.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-5 border-t border-white/10 pt-8 sm:space-y-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-white sm:text-base">Quick links and summary</h2>
          <p className="text-xs text-white/60 sm:text-sm">Keep things tidy with a few shortcuts.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <ul className="space-y-2 text-sm text-white">
            <li>
              <Link href="/settings" className="text-accent transition hover:text-white">
                Edit profile and preferences
              </Link>
            </li>
            <li>
              <Link href="/reading-list" className="text-accent transition hover:text-white">
                Manage reading list
              </Link>
            </li>
            <li>
              <a
                href="https://mangadex.org/"
                target="_blank"
                rel="noreferrer"
                className="text-accent transition hover:text-white"
              >
                Discover new titles
              </a>
            </li>
          </ul>
          <dl className="space-y-2 text-xs text-white/70 sm:space-y-3 sm:text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">Last update</dt>
              <dd className="text-white">{lastUpdatedDisplay}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">Most recent rating</dt>
              <dd className="text-white">
                {typeof mostRecentRating === "number" ? mostRecentRating.toFixed(1) : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/50">Tracked languages</dt>
              <dd className="text-white">{languagesLabel}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
