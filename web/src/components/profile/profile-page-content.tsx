"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FALLBACK_AVATAR = "/noprofile.jpg";
const SHOWCASE_LOCAL_STORAGE_PREFIX = "shujia.ten-showcase";
const SHOWCASE_LIMIT = 8;

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

interface RatedTenShowcaseProps {
  entries: ReadingListEntryDto[];
  userKey: string;
  isOwner: boolean;
}

function RatedTenShowcase({ entries, userKey, isOwner }: RatedTenShowcaseProps) {
  const storageKey = `${SHOWCASE_LOCAL_STORAGE_PREFIX}:${userKey}`;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userKey) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setSelectedIds(parsed);
        }
      } else if (entries.length) {
        const initial = entries.slice(0, SHOWCASE_LIMIT).map((entry) => entry.id);
        setSelectedIds(initial);
      }
    } catch (error) {
      console.warn("Failed to load showcase selections", error);
    } finally {
      setHydrated(true);
    }
  }, [entries, storageKey, userKey]);

  useEffect(() => {
    if (!hydrated) return;
    setSelectedIds((current) => current.filter((id) => entries.some((entry) => entry.id === id)));
  }, [entries, hydrated]);

  const selectedEntries = useMemo(() => {
    const map = new Map(entries.map((entry) => [entry.id, entry]));
    const ordered = selectedIds
      .map((id) => map.get(id))
      .filter((entry): entry is ReadingListEntryDto => Boolean(entry));
    if (ordered.length) {
      return ordered;
    }
    return entries.slice(0, SHOWCASE_LIMIT);
  }, [entries, selectedIds]);

  const remainingSlots = SHOWCASE_LIMIT - draftIds.length;

  const toggleDraft = (entryId: string) => {
    setDraftIds((current) => {
      if (current.includes(entryId)) {
        return current.filter((id) => id !== entryId);
      }
      if (current.length >= SHOWCASE_LIMIT) {
        return current;
      }
      return [...current, entryId];
    });
  };

  const startEditing = () => {
    setDraftIds(selectedIds.length ? selectedIds : entries.slice(0, SHOWCASE_LIMIT).map((entry) => entry.id));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftIds([]);
    setIsEditing(false);
  };

  const saveDraft = () => {
    setSelectedIds(draftIds);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(draftIds));
    }
    setIsEditing(false);
  };

  const cards = (list: ReadingListEntryDto[]) => (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
      {list.map((item) => (
        <li key={item.id} className="min-w-0">
          <Link href={`/manga/${item.mangaId}`} className="group block">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/5">
              {item.coverImage ? (
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 8vw, (min-width: 640px) 12vw, 30vw"
                  className="object-cover transition duration-200 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/70">
                  {item.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-center text-[0.55rem] text-white/70 sm:text-[0.6rem]">{item.title}</p>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Showcase</h2>
        </div>
        {isOwner ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draftIds.length}
                  className="rounded-md border border-accent px-3 py-1 font-medium text-accent transition enabled:hover:border-accent/70 enabled:hover:text-white disabled:border-white/15 disabled:text-white/40"
                >
                  Save selection
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-md border border-white/20 px-3 py-1 font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-md border border-white/20 px-3 py-1 font-medium text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Edit showcase
              </button>
            )}
          </div>
        ) : null}
      </header>

      {!entries.length ? (
        <p className="text-sm text-white/60">Start rating series with a perfect score to curate this space.</p>
      ) : null}

      {!isEditing ? (
        cards(selectedEntries)
      ) : (
        <div className="space-y-3">
          <p className="text-[0.7rem] text-white/60">
            Pick up to {SHOWCASE_LIMIT} titles. {remainingSlots > 0 ? `${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} open.` : "All slots filled."}
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => {
              const selected = draftIds.includes(entry.id);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => toggleDraft(entry.id)}
                    className={`flex w-full min-h-[3.25rem] items-start gap-3 rounded-xl border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      selected
                        ? "border-accent bg-accent/10 text-white shadow-[0_10px_25px_rgba(0,0,0,0.25)]"
                        : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${selected ? "bg-accent" : "bg-white/30"}`} aria-hidden />
                    <span className="flex-1 text-xs font-medium leading-snug text-white line-clamp-2 break-words">
                      {entry.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
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

export function ProfilePageContent({ user, readingList, isOwner }: ProfilePageContentProps) {
  const memberSince = formatMemberSince(user.memberSince);
  const avatar = user.avatarUrl?.trim() ? user.avatarUrl : FALLBACK_AVATAR;
  const bio = user.bio?.trim();
  const showcaseUserKey = user.email || user.username || user.name || "guest";
  const readingListHref = isOwner
    ? "/reading-list"
    : user.username
      ? `/reading-list?username=${encodeURIComponent(user.username)}`
      : "/reading-list";
  const toPossessive = (value: string) =>
    value.endsWith("s") || value.endsWith("S") ? `${value}'` : `${value}'s`;
  const readingListLabel = isOwner
    ? "View your list"
    : user.username
      ? `View @${toPossessive(user.username)} list`
      : "View reading list";

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

  const getPercentLabel = (count: number) => {
    if (!totalSeries) return "0%";
    return `${Math.round((count / totalSeries) * 100)}%`;
  };

  const primaryStatusSegments = [
    { label: "Completed", value: completedCount, barClass: "bg-emerald-400", dotClass: "bg-emerald-400" },
    { label: "In progress", value: inProgressCount, barClass: "bg-sky-500", dotClass: "bg-sky-500" },
    { label: "Planned", value: plannedCount, barClass: "bg-amber-400", dotClass: "bg-amber-400" },
  ].map((segment) => ({
    ...segment,
    percentLabel: getPercentLabel(segment.value),
  }));

  const remainderCount = Math.max(
    totalSeries - primaryStatusSegments.reduce((sum, segment) => sum + segment.value, 0),
    0,
  );
  const statusBarSegments =
    remainderCount > 0
      ? [
          ...primaryStatusSegments,
          {
            label: "Other",
            value: remainderCount,
            barClass: "bg-white/20",
            dotClass: "bg-white/40",
            percentLabel: getPercentLabel(remainderCount),
          },
        ]
      : primaryStatusSegments;
  const statusBarDenominator = statusBarSegments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  const ratings = readingList
    .map((entry) => entry.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length
    ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
    : null;
  const ratedCount = ratings.length;
  const unratedCount = Math.max(totalSeries - ratedCount, 0);
  const completionRateLabel = getPercentLabel(completedCount);
  const backlogCount = inProgressCount + plannedCount;
  const backlogRateLabel = getPercentLabel(backlogCount);
  const ratedShareLabel = ratedCount ? `${getPercentLabel(ratedCount)} of library` : "No ratings yet";
  const unratedShareLabel = unratedCount ? `${getPercentLabel(unratedCount)} remaining` : "All rated";

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
  const displayOwnerLabel = usernameLabel ?? user.name?.trim() ?? null;
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
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">{displayName}</h1>
                {usernameLabel ? (
                  <p className="text-sm text-white/60">{usernameLabel}</p>
                ) : null}
                {/* Email hidden from profile view */}
                <p className="text-sm text-white/45">
                  Member since {memberSince} | {user.timezone || "UTC"}
                </p>
              </div>
            </div>
            {bio ? (
              <div
                className="hidden text-sm text-white/65 sm:block sm:max-w-2xl"
                dangerouslySetInnerHTML={{ __html: markdownBioToHtml(bio) ?? "" }}
              />
            ) : isOwner ? (
              <p className="hidden text-sm text-white/65 sm:block sm:max-w-2xl">
                {"Add a short bio in settings to share what keeps you turning pages."}
              </p>
            ) : null}
            {/* Stats moved below bio for better mobile flow */}
          </div>
          <div className="ml-auto">
            <Link
              href={readingListHref}
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white sm:text-sm"
            >
              {readingListLabel}
            </Link>
          </div>
        </div>
        {/* Mobile bio below avatar + text */}
        {bio ? (
          <div
            className="text-sm text-white/65 sm:hidden"
            dangerouslySetInnerHTML={{ __html: markdownBioToHtml(bio) ?? "" }}
          />
        ) : isOwner ? (
          <p className="text-sm text-white/65 sm:hidden">
            {"Add a short bio in settings to share what keeps you turning pages."}
          </p>
        ) : null}
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

      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/45">Library pulse</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-semibold text-white sm:text-3xl">{totalSeries || "-"}</p>
              <span className="text-xs text-white/45">series tracked</span>
            </div>
          </div>
          <div className="flex flex-nowrap gap-4 overflow-x-auto text-[0.65rem] text-white/65 scrollbar-none sm:gap-6 sm:text-xs">
            <div className="min-w-[6.5rem]">
              <p className="text-[0.56rem] uppercase tracking-[0.24em] text-white/40">Average rating</p>
              <p className="text-sm font-semibold text-white sm:text-base">{averageRating ?? "-"}</p>
            </div>
            <div className="min-w-[6.5rem]">
              <p className="text-[0.56rem] uppercase tracking-[0.24em] text-white/40">Backlog</p>
              <p className="text-sm font-semibold text-white sm:text-base">
                {backlogCount}
                <span className="ml-1.5 text-[0.6rem] text-white/50 sm:ml-2 sm:text-[0.65rem]">{backlogRateLabel}</span>
              </p>
            </div>
            <div className="min-w-[6.5rem]">
              <p className="text-[0.56rem] uppercase tracking-[0.24em] text-white/40">Rated</p>
              <p className="text-sm font-semibold text-white sm:text-base">
                {ratedCount}
                <span className="ml-1.5 text-[0.6rem] text-white/50 sm:ml-2 sm:text-[0.65rem]">{ratedShareLabel}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-white/40">
            <span>Collection mix</span>
            <span className="text-white/55">{totalSeries ? `${totalSeries} total` : "No entries yet"}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
            <div className="flex h-full w-full">
              {statusBarSegments.map((segment) => (
                <div
                  key={segment.label}
                  className={`${segment.barClass} h-full`}
                  style={{ width: `${(segment.value / statusBarDenominator) * 100}%` }}
                  title={`${segment.label}: ${segment.value}`}
                  aria-label={`${segment.label}: ${segment.value}`}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-nowrap gap-3 overflow-x-auto text-[0.65rem] text-white/65 scrollbar-none sm:text-[0.75rem]">
            {primaryStatusSegments.map((segment) => (
              <span key={segment.label} className="flex min-w-[7rem] items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${segment.dotClass}`} />
                <span className="text-white/80">{segment.label}</span>
                <span className="text-white/50">{segment.value}</span>
                <span className="text-white/40">{segment.percentLabel}</span>
              </span>
            ))}
            {remainderCount > 0 ? (
              <span className="flex min-w-[7rem] items-center gap-2 text-white/60">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span>Other</span>
                <span>{remainderCount}</span>
                <span className="text-white/40">{getPercentLabel(remainderCount)}</span>
              </span>
            ) : null}
          </div>
        </div>

        <dl className="flex flex-nowrap gap-4 overflow-x-auto border-t border-white/10 pt-3 text-[0.65rem] text-white/65 scrollbar-none sm:grid sm:grid-cols-2 sm:gap-4 sm:text-xs lg:grid-cols-3">
          <div className="min-w-[8.5rem]">
            <dt className="text-[0.56rem] uppercase tracking-[0.24em] text-white/40">Completion</dt>
            <dd className="text-sm font-semibold text-white sm:text-base">{completionRateLabel}</dd>
            <p className="text-white/50">{completedCount} finished</p>
          </div>
          <div className="min-w-[8.5rem]">
            <dt className="text-[0.56rem] uppercase tracking-[0.24em] text-white/40">Active</dt>
            <dd className="text-sm font-semibold text-white sm:text-base">{inProgressCount}</dd>
            <p className="text-white/50">{getPercentLabel(inProgressCount)} of library</p>
          </div>
          <div className="min-w-[8.5rem]">
            <dt className="text-[0.56rem] uppercase tracking-[0.24em] text-white/40">Unrated</dt>
            <dd className="text-sm font-semibold text-white sm:text-base">{unratedCount}</dd>
            <p className="text-white/50">{unratedShareLabel}</p>
          </div>
        </dl>
      </section>

      {(ratedTens.length || isOwner) ? (
        <RatedTenShowcase entries={ratedTens} userKey={showcaseUserKey} isOwner={isOwner} />
      ) : null}

      {ratedTens.length ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Recently Rated 10</h2>
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
        ) : isOwner ? (
          <p className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-white/60">
            You have not logged any reading activity yet. Browse the latest titles and start tracking
            your shelf.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-white/60">
            {displayOwnerLabel ? `${displayOwnerLabel} has not logged any reading activity yet.` : "This reader has not logged any activity yet."}
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
        ) : isOwner ? (
          <p className="text-xs text-white/60 sm:text-sm">
            Start tracking series to see them grouped here.
          </p>
        ) : (
          <p className="text-xs text-white/60 sm:text-sm">
            {displayOwnerLabel ? `${displayOwnerLabel} has not grouped any series yet.` : "No series grouped yet."}
          </p>
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
          ) : isOwner ? (
            <p className="text-xs text-white/60 sm:text-sm">
              Tags will appear once you add a few more series to your list.
            </p>
          ) : (
            <p className="text-xs text-white/60 sm:text-sm">
              {displayOwnerLabel ? `${displayOwnerLabel} has not added tags yet.` : "No tags available yet."}
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
