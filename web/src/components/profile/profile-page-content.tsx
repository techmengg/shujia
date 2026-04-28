"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FollowButton } from "@/components/users/follow-button";
import { normalizeStatus, statusLabel } from "@/lib/manga/status";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProfileUser {
  name: string | null;
  email: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  profileColor: string | null;
  favoriteMangaIds: string[];
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

interface ReviewDto {
  id: string;
  provider: string;
  mangaId: string;
  rating: number;
  body: string | null;
  createdAt: string;
}

interface ProfilePageContentProps {
  user: ProfileUser;
  readingList: ReadingListEntryDto[];
  reviews: ReviewDto[];
  isOwner: boolean;
  isAuthenticated?: boolean;
  followerCount?: number;
  followingCount?: number;
  viewerIsFollowing?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMemberSince(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long" }).format(date);
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownBioToHtml(raw?: string | null): string | null {
  if (!raw) return null;
  const escaped = escapeHtml(raw);
  let html = escaped.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-accent hover:text-white transition">$1</a>',
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br/>");
  return html;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const MAX_FAVORITES = 8;

type FavoritesFilter = "all" | "rated" | "completed";

const PICKER_VISIBLE_LIMIT = 16;

function FavoritesEditor({
  readingList,
  currentIds,
  onSave,
  onCancel,
}: {
  readingList: ReadingListEntryDto[];
  currentIds: string[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(currentIds);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FavoritesFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const entryById = useMemo(
    () => new Map(readingList.map((e) => [e.mangaId, e])),
    [readingList],
  );

  const slots: (ReadingListEntryDto | null)[] = Array.from(
    { length: MAX_FAVORITES },
    (_, i) => {
      const id = draft[i];
      return id ? entryById.get(id) ?? null : null;
    },
  );

  const remove = (mangaId: string) => {
    setDraft((prev) => prev.filter((id) => id !== mangaId));
  };

  const add = (mangaId: string) => {
    setDraft((prev) => {
      if (prev.includes(mangaId)) return prev;
      if (prev.length >= MAX_FAVORITES) return prev;
      return [...prev, mangaId];
    });
  };

  const swap = (i: number, j: number) => {
    setDraft((prev) => {
      if (i < 0 || j < 0 || i >= prev.length || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const pickerEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = readingList.filter((e) => !draft.includes(e.mangaId));

    if (filter === "completed") {
      list = list.filter((e) => normalizeStatus(e.status) === "completed");
    } else if (filter === "rated") {
      list = list.filter((e) => typeof e.rating === "number" && e.rating >= 8);
    }

    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.altTitles.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return [...list].sort((a, b) => {
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      if (rb !== ra) return rb - ra;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [readingList, draft, query, filter]);

  const filledCount = draft.length;
  const remaining = MAX_FAVORITES - filledCount;
  const slotsFull = remaining === 0;
  const dirty =
    draft.length !== currentIds.length ||
    draft.some((id, i) => id !== currentIds[i]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header: count + actions */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.7rem] text-white/45 sm:text-xs">
          <span className="tabular-nums text-white/70">{filledCount}</span>
          <span className="text-white/30"> of </span>
          <span className="tabular-nums text-white/70">{MAX_FAVORITES}</span>
          <span> pinned</span>
          {remaining > 0 ? (
            <span className="text-white/25"> · {remaining} open</span>
          ) : null}
        </p>
        <div className="flex items-baseline gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-[0.7rem] font-medium text-white/45 transition hover:text-white sm:text-xs"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={!dirty}
            className="group inline-flex items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:text-white/25 sm:text-xs"
          >
            <span className="underline-offset-4 group-hover:underline group-disabled:no-underline">
              save
            </span>
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-disabled:translate-x-0"
            >
              →
            </span>
          </button>
        </div>
      </div>

      {/* Slot rail: 8 ordered slots, empty = dashed placeholder */}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
        {slots.map((entry, i) => (
          <li key={i} className="min-w-0">
            {entry ? (
              <div className="group relative">
                <div className="relative aspect-[2/3] w-full overflow-hidden border border-accent/50">
                  {entry.coverImage ? (
                    <Image
                      src={entry.coverImage}
                      alt={entry.title}
                      fill
                      sizes="(min-width: 640px) 12vw, 25vw"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/5 text-sm font-semibold text-white/70">
                      {entry.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute left-0 top-0 inline-flex h-4 min-w-[1rem] items-center justify-center bg-black/85 px-1 text-[0.55rem] font-semibold tabular-nums text-accent sm:h-5 sm:text-[0.65rem]">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(entry.mangaId)}
                    aria-label={`Unpin ${entry.title}`}
                    className="absolute right-0 top-0 inline-flex h-4 w-4 items-center justify-center bg-black/85 text-[0.7rem] leading-none text-white/70 opacity-0 transition hover:text-white focus:opacity-100 group-hover:opacity-100 sm:h-5 sm:w-5 sm:text-xs"
                  >
                    ×
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-1 pb-0.5 pt-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => swap(i, i - 1)}
                      disabled={i === 0}
                      aria-label="Move left"
                      className="text-[0.75rem] leading-none text-white/70 transition hover:text-accent disabled:cursor-not-allowed disabled:text-white/15 disabled:hover:text-white/15"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => swap(i, i + 1)}
                      disabled={i >= filledCount - 1}
                      aria-label="Move right"
                      className="text-[0.75rem] leading-none text-white/70 transition hover:text-accent disabled:cursor-not-allowed disabled:text-white/15 disabled:hover:text-white/15"
                    >
                      →
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-1 text-center text-[0.55rem] leading-tight text-white/55 sm:text-[0.6rem]">
                  {entry.title}
                </p>
              </div>
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center border border-dashed border-white/15">
                <span className="text-base font-semibold tabular-nums text-white/15 sm:text-lg">
                  {i + 1}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Picker controls */}
      <div className="space-y-2.5 border-t border-white/10 pt-4 sm:space-y-3">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowAll(false);
            }}
            placeholder="Search your library"
            className="w-full border-b border-white/15 bg-transparent py-1.5 pr-7 text-sm text-white placeholder:italic placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setShowAll(false);
              }}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-sm leading-none text-white/40 transition hover:text-white"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.7rem] sm:text-xs">
          <FavoritesFilterChip
            active={filter === "all"}
            onClick={() => {
              setFilter("all");
              setShowAll(false);
            }}
          >
            all
          </FavoritesFilterChip>
          <FavoritesFilterChip
            active={filter === "rated"}
            onClick={() => {
              setFilter("rated");
              setShowAll(false);
            }}
          >
            top rated
          </FavoritesFilterChip>
          <FavoritesFilterChip
            active={filter === "completed"}
            onClick={() => {
              setFilter("completed");
              setShowAll(false);
            }}
          >
            completed
          </FavoritesFilterChip>
          <span className="ml-auto tabular-nums text-white/30">
            {pickerEntries.length} {pickerEntries.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>

      {/* Picker grid — capped at 2 desktop rows; "show more" expands */}
      {pickerEntries.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 sm:gap-2.5">
          {(showAll ? pickerEntries : pickerEntries.slice(0, PICKER_VISIBLE_LIMIT)).map((entry) => (
            <li key={entry.mangaId} className="min-w-0">
              <button
                type="button"
                onClick={() => add(entry.mangaId)}
                disabled={slotsFull}
                aria-label={`Pin ${entry.title}`}
                className="group block w-full text-left disabled:cursor-not-allowed"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                  {entry.coverImage ? (
                    <Image
                      src={entry.coverImage}
                      alt={entry.title}
                      fill
                      sizes="(min-width: 1024px) 8vw, (min-width: 640px) 12vw, 25vw"
                      unoptimized
                      className={`object-cover transition ${
                        slotsFull ? "opacity-25" : "group-hover:opacity-40"
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/70">
                      {entry.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!slotsFull ? (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
                      <span className="text-[0.7rem] font-medium text-accent sm:text-xs">
                        + pin
                      </span>
                    </div>
                  ) : null}
                  {typeof entry.rating === "number" ? (
                    <span className="absolute bottom-0 right-0 bg-black/85 px-1 py-0.5 text-[0.55rem] font-medium tabular-nums text-accent sm:text-[0.65rem]">
                      {entry.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-1 text-center text-[0.55rem] leading-tight text-white/50 sm:text-[0.6rem]">
                  {entry.title}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-surface-subtle">
          {query
            ? `No series match "${query}".`
            : readingList.length === 0
              ? "Add series to your reading list before pinning favorites."
              : filter !== "all"
                ? "Nothing in your library matches this filter."
                : "Nothing left to pin."}
        </p>
      )}

      {pickerEntries.length > PICKER_VISIBLE_LIMIT ? (
        <div className="flex items-baseline justify-between gap-3 text-[0.7rem] sm:text-xs">
          <p className="italic text-surface-subtle">
            {showAll
              ? `Showing all ${pickerEntries.length}.`
              : `Showing ${PICKER_VISIBLE_LIMIT} of ${pickerEntries.length} — search to narrow.`}
          </p>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="group inline-flex items-baseline gap-1 font-medium text-accent transition-colors hover:text-white"
          >
            <span className="underline-offset-4 group-hover:underline">
              {showAll ? "show less" : `show all (${pickerEntries.length})`}
            </span>
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </button>
        </div>
      ) : null}

      {slotsFull ? (
        <p className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
          All 8 slots filled — unpin one to swap.
        </p>
      ) : null}
    </div>
  );
}

function FavoritesFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-medium transition ${
        active
          ? "text-white underline underline-offset-[5px] decoration-accent decoration-2"
          : "text-surface-subtle hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-lg font-semibold text-white sm:text-xl">{value}</p>
      <p className="text-[0.7rem] text-white/50 sm:text-xs">{label}</p>
      {sub ? <p className="text-[0.6rem] text-white/35 sm:text-[0.7rem]">{sub}</p> : null}
    </div>
  );
}

function RatingDistribution({ ratings }: { ratings: number[] }) {
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const score = 10 - i;
    return { score, count: ratings.filter((r) => Math.round(r) === score).length };
  });
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-1">
      {buckets.map(({ score, count }) => (
        <div key={score} className="flex items-center gap-2 text-[0.7rem] sm:text-xs">
          <span className="w-4 text-right font-medium text-white/60">{score}</span>
          <div className="relative h-2.5 flex-1 overflow-hidden bg-white/5">
            <div
              className="absolute inset-y-0 left-0 bg-accent/70 transition-all duration-300"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-5 text-right tabular-nums text-white/45">{count || ""}</span>
        </div>
      ))}
    </div>
  );
}

function CoverGrid({ entries, emptyText }: { entries: ReadingListEntryDto[]; emptyText?: string }) {
  if (!entries.length && emptyText) {
    return <p className="text-sm italic text-surface-subtle">{emptyText}</p>;
  }

  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 sm:gap-2.5">
      {entries.map((item) => (
        <li key={item.id} className="min-w-0">
          <Link href={`/manga/${item.mangaId}`} className="group block">
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
              {item.coverImage ? (
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 8vw, (min-width: 640px) 12vw, 25vw"
                  unoptimized
                  className="object-cover transition duration-200 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/70">
                  {item.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-center text-[0.55rem] leading-tight text-white/60 sm:text-[0.65rem]">
              {item.title}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ProfilePageContent({
  user,
  readingList,
  reviews,
  isOwner,
  isAuthenticated = false,
  followerCount = 0,
  followingCount = 0,
  viewerIsFollowing = false,
}: ProfilePageContentProps) {
  const router = useRouter();
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [currentFavoriteIds, setCurrentFavoriteIds] = useState(user.favoriteMangaIds);

  const saveFavorites = useCallback(
    async (ids: string[]) => {
      try {
        const res = await fetch("/api/settings/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            timezone: user.timezone,
            favoriteMangaIds: ids,
          }),
        });
        if (res.ok) {
          setCurrentFavoriteIds(ids);
          setEditingFavorites(false);
          router.refresh();
        }
      } catch {
        // silently fail — user can retry
      }
    },
    [user.username, user.timezone, router],
  );

  const memberSince = formatMemberSince(user.memberSince);
  const avatar = user.avatarUrl?.trim() || null;
  const banner = user.bannerUrl?.trim() || null;
  const profileColor = user.profileColor?.trim() || null;
  const bio = user.bio?.trim();

  const displayName = user.name?.trim() || (user.username ? `@${user.username}` : user.email);
  const usernameLabel = user.username ? `@${user.username}` : null;

  const readingListHref = user.username
    ? `/${encodeURIComponent(user.username.toLowerCase())}/reading-list`
    : "/reading-list";

  // --- Stats ---
  const totalSeries = readingList.length;
  const ratings = readingList.map((e) => e.rating).filter((r): r is number => typeof r === "number");
  const averageRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null;

  const statusCounts = useMemo(() => {
    const counts = { completed: 0, reading: 0, "on-hold": 0, dropped: 0, "plan-to-read": 0, unknown: 0 };
    for (const entry of readingList) {
      counts[normalizeStatus(entry.status)]++;
    }
    return counts;
  }, [readingList]);

  // --- Favorites (server-persisted) ---
  const favorites = useMemo(() => {
    if (!currentFavoriteIds.length) return [];
    const map = new Map(readingList.map((e) => [e.mangaId, e]));
    return currentFavoriteIds
      .map((id) => map.get(id))
      .filter((e): e is ReadingListEntryDto => Boolean(e));
  }, [currentFavoriteIds, readingList]);

  // --- Top tags ---
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of readingList) {
      for (const tag of entry.tags) {
        const key = tag.trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [readingList]);

  // --- Status bar segments ---
  const statusSegments = [
    { label: "Completed", count: statusCounts.completed, color: "bg-emerald-400" },
    { label: "Reading", count: statusCounts.reading, color: "bg-sky-500" },
    { label: "On hold", count: statusCounts["on-hold"], color: "bg-amber-400" },
    { label: "Dropped", count: statusCounts.dropped, color: "bg-red-400" },
    { label: "Plan to read", count: statusCounts["plan-to-read"], color: "bg-violet-400" },
  ].filter((s) => s.count > 0);

  const statusTotal = statusSegments.reduce((sum, s) => sum + s.count, 0) || 1;

  // --- Recent activity (last 5 updates) ---
  const recentActivity = readingList.slice(0, 5);

  // --- CSS variable override for profile accent ---
  const profileStyle = profileColor
    ? ({ "--profile-accent": profileColor } as React.CSSProperties)
    : undefined;

  return (
    <main
      className="mx-auto w-full max-w-4xl pb-16"
      style={profileStyle}
    >
      {/* ============================================================ */}
      {/*  Banner + Avatar hero                                        */}
      {/* ============================================================ */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-28 w-full overflow-hidden bg-white/5 sm:h-40 md:h-48">
          {banner ? (
            <Image
              src={banner}
              alt="Profile banner"
              fill
              priority
              sizes="100vw"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={profileColor ? { backgroundColor: `${profileColor}22` } : undefined}
            />
          )}
          {/* Gradient fade at bottom so text is readable */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent sm:h-20" />
        </div>

        {/* Avatar — overlapping banner bottom edge */}
        <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="relative -mt-12 sm:-mt-16">
            <div className="relative flex aspect-square h-24 w-24 items-center justify-center overflow-hidden border-2 border-black bg-surface sm:h-32 sm:w-32">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={`${displayName} avatar`}
                  fill
                  priority
                  sizes="(min-width: 640px) 128px, 96px"
                  quality={100}
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-white/70 sm:text-3xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Identity block                                              */}
      {/* ============================================================ */}
      <div className="mx-auto w-full max-w-4xl px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold text-white sm:text-2xl">{displayName}</h1>
            {usernameLabel && displayName !== `@${user.username}` ? (
              <p className="text-sm text-white/50">{usernameLabel}</p>
            ) : null}
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.7rem] text-white/40 sm:text-xs">
              <span>Joined {memberSince}</span>
              <span aria-hidden className="text-white/20">·</span>
              <span>
                <span className="tabular-nums text-white/65">{followerCount}</span>{" "}
                <span>{followerCount === 1 ? "follower" : "followers"}</span>
              </span>
              <span aria-hidden className="text-white/20">·</span>
              <span>
                <span className="tabular-nums text-white/65">{followingCount}</span>{" "}
                <span>following</span>
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {isOwner ? (
              <Link
                href="/settings/profile"
                className="inline-flex items-center border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Edit profile
              </Link>
            ) : user.username ? (
              <FollowButton
                targetUsername={user.username}
                initiallyFollowing={viewerIsFollowing}
                isAuthenticated={isAuthenticated}
                isOwner={isOwner}
                className="px-3 py-1.5"
              />
            ) : null}
            <Link
              href={readingListHref}
              className="group inline-flex items-center gap-1 border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition hover:border-accent hover:text-white"
            >
              <span>{isOwner ? "Your list" : "Reading list"}</span>
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Bio */}
        {bio ? (
          <div
            className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65"
            dangerouslySetInnerHTML={{ __html: markdownBioToHtml(bio) ?? "" }}
          />
        ) : isOwner ? (
          <p className="mt-3 max-w-2xl text-sm italic text-surface-subtle">
            Add a bio in{" "}
            <Link href="/settings/profile" className="text-accent hover:text-white transition">
              settings
            </Link>{" "}
            to tell visitors your thoughts.
          </p>
        ) : null}
      </div>

      {/* ============================================================ */}
      {/*  Stats strip                                                 */}
      {/* ============================================================ */}
      <div className="mx-auto mt-6 w-full max-w-4xl border-y border-white/10 px-4 py-4 sm:mt-8 sm:px-6 sm:py-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3 sm:gap-x-12">
          <StatCell label="Series tracked" value={totalSeries} />
          <StatCell label="Completed" value={statusCounts.completed} />
          <StatCell label="Reading" value={statusCounts.reading} />
          <StatCell label="Plan to read" value={statusCounts["plan-to-read"]} />
          {averageRating ? <StatCell label="Mean score" value={averageRating} sub={`${ratings.length} rated`} /> : null}
          <StatCell label="Reviews" value={reviews.length} />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Body content                                                */}
      {/* ============================================================ */}
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 pt-6 sm:space-y-10 sm:px-6 sm:pt-8">

        {/* --- Status distribution bar --- */}
        {totalSeries > 0 ? (
          <section className="space-y-2">
            <div className="h-2 w-full overflow-hidden bg-white/5">
              <div className="flex h-full">
                {statusSegments.map((seg) => (
                  <div
                    key={seg.label}
                    className={`${seg.color} h-full`}
                    style={{ width: `${(seg.count / statusTotal) * 100}%` }}
                    title={`${seg.label}: ${seg.count}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] text-white/55 sm:text-xs">
              {statusSegments.map((seg) => (
                <span key={seg.label} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 ${seg.color}`} />
                  {seg.label} {seg.count}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* --- Favorites --- */}
        {favorites.length > 0 || isOwner ? (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-white sm:text-base">Favorites</h2>
              {isOwner && !editingFavorites ? (
                <button
                  type="button"
                  onClick={() => setEditingFavorites(true)}
                  className="group inline-flex items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
                >
                  <span className="underline-offset-4 group-hover:underline">edit</span>
                  <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </button>
              ) : null}
            </div>
            {editingFavorites && isOwner ? (
              <FavoritesEditor
                readingList={readingList}
                currentIds={currentFavoriteIds}
                onSave={saveFavorites}
                onCancel={() => setEditingFavorites(false)}
              />
            ) : favorites.length > 0 ? (
              <CoverGrid entries={favorites} />
            ) : isOwner ? (
              <p className="text-sm italic text-surface-subtle">
                Click edit to pin your favorite series here.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* --- Rating distribution --- */}
        {ratings.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white sm:text-base">Rating distribution</h2>
            <div className="max-w-md">
              <RatingDistribution ratings={ratings} />
            </div>
          </section>
        ) : null}

        {/* --- Recent activity --- */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-white sm:text-base">Recent activity</h2>
            <Link
              href={readingListHref}
              className="group inline-flex items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
            >
              <span className="underline-offset-4 group-hover:underline">see all</span>
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {recentActivity.length > 0 ? (
            <ul className="divide-y divide-white/10">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
                  <Link href={`/manga/${entry.mangaId}`} className="shrink-0">
                    <div className="relative h-16 w-11 overflow-hidden bg-white/5 sm:h-20 sm:w-14">
                      {entry.coverImage ? (
                        <Image
                          src={entry.coverImage}
                          alt={entry.title}
                          fill
                          sizes="56px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/50">
                          {entry.title.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <Link
                      href={`/manga/${entry.mangaId}`}
                      className="truncate text-xs font-semibold text-white hover:text-accent transition sm:text-sm"
                    >
                      {entry.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] text-white/45 sm:text-xs">
                      {statusLabel(entry.status) ? (
                        <span>{statusLabel(entry.status)}</span>
                      ) : null}
                      {entry.progress ? (
                        <>
                          <span className="text-white/20">·</span>
                          <span>{entry.progress}</span>
                        </>
                      ) : null}
                      {typeof entry.rating === "number" ? (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-accent">{entry.rating.toFixed(1)}</span>
                        </>
                      ) : null}
                      <span className="text-white/20">·</span>
                      <span>{formatShortDate(entry.updatedAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : isOwner ? (
            <p className="text-sm italic text-surface-subtle">
              Start tracking series to build your activity feed.
            </p>
          ) : (
            <p className="text-sm italic text-surface-subtle">No activity yet.</p>
          )}
        </section>

        {/* --- Top genres / tags --- */}
        {topTags.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white sm:text-base">Top genres</h2>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 border border-white/10 px-2.5 py-1 text-[0.7rem] text-white/65 sm:text-xs"
                >
                  {tag}
                  <span className="text-white/30">{count}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* --- Recent reviews --- */}
        {reviews.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white sm:text-base">Recent reviews</h2>
            <ul className="divide-y divide-white/10">
              {reviews.slice(0, 3).map((review) => {
                const matchingEntry = readingList.find(
                  (e) => e.mangaId === review.mangaId,
                );
                const title = matchingEntry?.title ?? `Series ${review.mangaId}`;
                return (
                  <li key={review.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={`/manga/${review.mangaId}`}
                        className="truncate text-xs font-semibold text-white hover:text-accent transition sm:text-sm"
                      >
                        {title}
                      </Link>
                      <div className="flex shrink-0 items-center gap-2 text-[0.7rem] text-white/45 sm:text-xs">
                        <span className="text-accent font-medium">{review.rating}/10</span>
                        <span>{formatShortDate(review.createdAt)}</span>
                      </div>
                    </div>
                    {review.body ? (
                      <p className="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-white/55 sm:text-sm">
                        {review.body}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
