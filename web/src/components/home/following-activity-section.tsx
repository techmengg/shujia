import Image from "next/image";
import Link from "next/link";

import type { FollowingActivityItem } from "@/lib/home/following-activity";
import { normalizeStatus } from "@/lib/manga/status";

interface FollowingActivitySectionProps {
  items: FollowingActivityItem[];
  isAuthenticated: boolean;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

interface ActivityVerb {
  verb: string;
  trailing?: string;
  ratingBadge?: string;
}

function deriveVerb(item: FollowingActivityItem): ActivityVerb {
  // Rating is the most informative signal — when present, lead with it.
  if (typeof item.rating === "number") {
    return {
      verb: "rated",
      ratingBadge: item.rating.toFixed(1),
    };
  }
  switch (normalizeStatus(item.status)) {
    case "reading":
      return {
        verb: item.progress?.trim() ? "is reading" : "started reading",
      };
    case "completed":
      return { verb: "completed" };
    case "plan-to-read":
      return { verb: "plans to read" };
    case "on-hold":
      return { verb: "paused" };
    case "dropped":
      return { verb: "dropped" };
    default:
      return { verb: "added" };
  }
}

export function FollowingActivitySection({
  items,
  isAuthenticated,
}: FollowingActivitySectionProps) {
  if (!isAuthenticated) {
    return (
      <p className="text-sm italic text-surface-subtle">
        <Link
          href="/login?redirect=/"
          className="not-italic text-accent transition-colors hover:text-white"
        >
          Log in
        </Link>{" "}
        to see what people you follow are tracking.
      </p>
    );
  }
  if (!items.length) {
    return (
      <p className="text-sm italic text-surface-subtle">
        Nothing yet — follow a few readers to see their picks here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 border-y border-white/10">
      {items.map((item) => {
        const displayName =
          item.user.name?.trim() ||
          (item.user.username ? `@${item.user.username}` : "Anonymous");
        const initial = displayName.charAt(0).toUpperCase();
        const profileHref = item.user.username
          ? `/${encodeURIComponent(item.user.username.toLowerCase())}`
          : null;
        const { verb, ratingBadge } = deriveVerb(item);
        const relative = formatRelativeTime(item.updatedAt);

        return (
          <li key={item.id} className="flex items-center gap-3 py-2.5 sm:py-3">
            {profileHref ? (
              <Link
                href={profileHref}
                aria-label={`${displayName}'s profile`}
                className="relative h-7 w-7 shrink-0 overflow-hidden bg-white/5 transition-opacity hover:opacity-85"
              >
                {item.user.avatarUrl ? (
                  <Image
                    src={item.user.avatarUrl}
                    alt=""
                    fill
                    sizes="28px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold text-white/70">
                    {initial}
                  </div>
                )}
              </Link>
            ) : null}
            <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[0.8rem] sm:text-sm">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="font-medium text-white transition-colors hover:text-accent"
                >
                  {displayName}
                </Link>
              ) : (
                <span className="font-medium text-white">{displayName}</span>
              )}
              <span className="text-surface-subtle">{verb}</span>
              <Link
                href={`/manga/${item.manga.mangaId}`}
                className="line-clamp-1 min-w-0 max-w-full text-white transition-colors hover:text-accent"
              >
                &ldquo;{item.manga.title}&rdquo;
              </Link>
              {ratingBadge ? (
                <span className="font-medium tabular-nums text-accent">
                  {ratingBadge}
                </span>
              ) : null}
            </p>
            <span className="shrink-0 text-[0.65rem] tabular-nums text-surface-subtle sm:text-xs">
              {relative}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
