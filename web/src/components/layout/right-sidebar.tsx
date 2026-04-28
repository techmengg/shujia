import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { ReactNode } from "react";

import { FollowButton } from "@/components/users/follow-button";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeStatus } from "@/lib/manga/status";
import { getComicsNews, type NewsHeadline } from "@/lib/news/animenewsnetwork";
import { prisma } from "@/lib/prisma";

interface SuggestedUser {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

const getSuggestedUsersForViewer = unstable_cache(
  async (excludeIds: string[]): Promise<SuggestedUser[]> => {
    const candidates = await prisma.user.findMany({
      where: excludeIds.length ? { id: { notIn: excludeIds } } : undefined,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
      },
      take: 60,
    });
    if (!candidates.length) return [];
    // In-memory shuffle — adequate at small scale; swap to ORDER BY random()
    // via $queryRaw if user count grows past low thousands.
    return [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  },
  ["sidebar-suggested-users"],
  { revalidate: 60, tags: ["sidebar-suggested-users"] },
);

interface RecentReview {
  id: string;
  authorName: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  rating: number;
  body: string | null;
  hasSpoilers: boolean;
  provider: string;
  mangaId: string;
  mangaTitle: string | null;
  createdAt: string;
}

const getRecentReviewsForSidebar = unstable_cache(
  async (): Promise<RecentReview[]> => {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        author: {
          select: { name: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!reviews.length) return [];

    const titleByKey = new Map<string, string>();
    const keys = reviews.map((r) => ({
      provider: r.provider,
      mangaId: r.mangaId,
    }));
    const titleEntries = await prisma.readingListEntry.findMany({
      where: { OR: keys },
      select: { provider: true, mangaId: true, title: true },
    });
    for (const entry of titleEntries) {
      const key = `${entry.provider}/${entry.mangaId}`;
      if (!titleByKey.has(key)) titleByKey.set(key, entry.title);
    }

    return reviews.map((r) => ({
      id: r.id,
      authorName: r.author?.name ?? null,
      authorUsername: r.author?.username ?? "",
      authorAvatar: r.author?.avatarUrl ?? null,
      rating: r.rating,
      body: r.body,
      hasSpoilers: r.hasSpoilers,
      provider: r.provider,
      mangaId: r.mangaId,
      mangaTitle: titleByKey.get(`${r.provider}/${r.mangaId}`) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  },
  ["sidebar-recent-reviews"],
  { revalidate: 60, tags: ["sidebar-recent-reviews"] },
);

interface ReadingEntry {
  id: string;
  mangaId: string;
  title: string;
  coverImage: string | null;
  progress: string | null;
  rating: number | null;
  status: string | null;
  tags: string[];
  updatedAt: Date;
}

export async function RightSidebar() {
  const [viewer, news, recentReviews] = await Promise.all([
    getCurrentUser(),
    getComicsNews(),
    getRecentReviewsForSidebar(),
  ]);

  let excludeIds: string[] = [];
  if (viewer) {
    excludeIds = [viewer.id];
    const alreadyFollowing = await prisma.follow.findMany({
      where: { followerId: viewer.id },
      select: { followingId: true },
    });
    excludeIds.push(...alreadyFollowing.map((f) => f.followingId));
  }
  const suggestedUsers = await getSuggestedUsersForViewer(excludeIds);
  const isAuthenticated = Boolean(viewer);

  let userData: {
    username: string;
    continueReading: ReadingEntry | null;
    topTags: [string, number][];
  } | null = null;

  if (viewer?.username) {
    const entries = (await prisma.readingListEntry.findMany({
      where: { userId: viewer.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        mangaId: true,
        title: true,
        coverImage: true,
        progress: true,
        rating: true,
        status: true,
        tags: true,
        updatedAt: true,
      },
    })) as ReadingEntry[];

    const reading = entries.filter((e) => normalizeStatus(e.status) === "reading");

    const tagCounts = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.tags) {
        const key = t.trim();
        if (key) tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    userData = {
      username: viewer.username,
      continueReading: reading[0] ?? null,
      topTags,
    };
  }

  return (
    <div className="space-y-7">
      <NewsWidget items={news} />

      {/* Discover */}
      <section className="space-y-2">
        <SectionHeading>Discover</SectionHeading>
        <ul className="space-y-0">
          <SidebarLink href="/manga/random">Random comics</SidebarLink>
          <SidebarLink href="/explore">Comics finder</SidebarLink>
          <SidebarLink href="/explore">Latest series</SidebarLink>
          <SidebarComingSoon>Forum</SidebarComingSoon>
          <SidebarComingSoon>Series ranking</SidebarComingSoon>
          <SidebarComingSoon>Recommendation lists</SidebarComingSoon>
        </ul>
      </section>

      {recentReviews.length > 0 ? (
        <RecentReviewsWidget items={recentReviews} />
      ) : null}

      {suggestedUsers.length > 0 ? (
        <SuggestedUsersWidget users={suggestedUsers} isAuthenticated={isAuthenticated} />
      ) : null}

      {/* Your library — auth gated */}
      {userData ? (
        <>
          <section className="space-y-2">
            <SectionHeading>Your library</SectionHeading>
            <ul className="space-y-0">
              <SidebarLink
                href={`/${encodeURIComponent(userData.username.toLowerCase())}/reading-list`}
              >
                Reading list
              </SidebarLink>
              <SidebarComingSoon>Create rec list</SidebarComingSoon>
            </ul>
          </section>

          {userData.continueReading ? (
            <ContinueReadingWidget item={userData.continueReading} />
          ) : null}

          {userData.topTags.length > 0 ? (
            <TopTagsWidget tags={userData.topTags} />
          ) : null}
        </>
      ) : (
        <p className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
          <Link
            href="/login"
            className="not-italic text-accent transition-colors hover:text-white"
          >
            Log in
          </Link>{" "}
          to track your library here.
        </p>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-white/15 pb-1.5 text-sm font-semibold text-white">
      {children}
    </h3>
  );
}

function SidebarLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-baseline justify-between gap-2 py-1 text-[0.85rem] text-surface-foreground transition-colors hover:text-accent"
      >
        <span>{children}</span>
        <span
          aria-hidden
          className="text-white/15 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
        >
          &rarr;
        </span>
      </Link>
    </li>
  );
}

function SidebarComingSoon({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-2 py-1 text-[0.85rem] text-surface-subtle">
      <span>{children}</span>
      <span className="text-[0.65rem] italic text-surface-subtle/70">(coming soon)</span>
    </li>
  );
}

function ContinueReadingWidget({ item }: { item: ReadingEntry }) {
  return (
    <section className="space-y-2">
      <SectionHeading>Continue reading</SectionHeading>
      <Link
        href={`/manga/${item.mangaId}`}
        className="group flex items-center gap-3 transition-opacity hover:opacity-90"
      >
        <div className="relative h-14 w-10 shrink-0 overflow-hidden bg-white/5">
          {item.coverImage ? (
            <Image
              src={item.coverImage}
              alt={item.title}
              fill
              sizes="40px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/60">
              {item.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[0.85rem] font-medium text-white transition-colors group-hover:text-accent">
            {item.title}
          </p>
          {item.progress?.trim() ? (
            <p className="text-[0.7rem] text-surface-subtle">{item.progress.trim()}</p>
          ) : (
            <p className="text-[0.7rem] italic text-surface-subtle">Not started</p>
          )}
        </div>
      </Link>
    </section>
  );
}

function TopTagsWidget({ tags }: { tags: [string, number][] }) {
  return (
    <section className="space-y-2">
      <SectionHeading>Your top genres</SectionHeading>
      <ul className="space-y-0.5">
        {tags.map(([tag, count]) => (
          <li
            key={tag}
            className="flex items-baseline justify-between gap-2 text-[0.75rem]"
          >
            <span className="line-clamp-1 text-surface-foreground">{tag.toLowerCase()}</span>
            <span className="shrink-0 text-[0.65rem] tabular-nums text-surface-subtle">
              {count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuggestedUsersWidget({
  users,
  isAuthenticated,
}: {
  users: SuggestedUser[];
  isAuthenticated: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading>Who to follow</SectionHeading>
      <ul className="space-y-3">
        {users.map((user) => {
          const displayName = user.name?.trim() || `@${user.username}`;
          const initial = displayName.charAt(0).toUpperCase();
          const profileHref = `/${encodeURIComponent(user.username.toLowerCase())}`;
          const bio = user.bio?.trim();

          return (
            <li key={user.id} className="flex items-start gap-2">
              <Link
                href={profileHref}
                aria-label={`${displayName}'s profile`}
                className="relative h-8 w-8 shrink-0 overflow-hidden bg-white/5 transition-opacity hover:opacity-85"
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    fill
                    sizes="32px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[0.7rem] font-semibold text-white/70">
                    {initial}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={profileHref}
                    className="line-clamp-1 text-[0.8rem] font-medium text-white transition-colors hover:text-accent"
                  >
                    {displayName}
                  </Link>
                  <FollowButton
                    targetUsername={user.username}
                    initiallyFollowing={false}
                    isAuthenticated={isAuthenticated}
                    variant="compact"
                  />
                </div>
                {bio ? (
                  <p className="line-clamp-2 text-[0.65rem] text-surface-subtle">
                    {bio}
                  </p>
                ) : (
                  <p className="text-[0.65rem] italic text-surface-subtle">
                    @{user.username}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentReviewsWidget({ items }: { items: RecentReview[] }) {
  return (
    <section className="space-y-3">
      <SectionHeading>Recent reviews</SectionHeading>
      <ul className="space-y-3">
        {items.map((review) => {
          const displayName =
            review.authorName?.trim() ||
            (review.authorUsername ? `@${review.authorUsername}` : "Anonymous");
          const initial = displayName.charAt(0).toUpperCase();
          const profileHref = review.authorUsername
            ? `/${encodeURIComponent(review.authorUsername.toLowerCase())}`
            : null;

          return (
            <li key={review.id}>
              <article className="space-y-1">
                <div className="flex items-start gap-2">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      aria-label={`${displayName}'s profile`}
                      className="relative h-7 w-7 shrink-0 overflow-hidden bg-white/5 transition-opacity hover:opacity-85"
                    >
                      {review.authorAvatar ? (
                        <Image
                          src={review.authorAvatar}
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="line-clamp-1 text-[0.8rem] font-medium text-white transition-colors hover:text-accent"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <span className="line-clamp-1 text-[0.8rem] font-medium text-white">
                          {displayName}
                        </span>
                      )}
                      <span className="shrink-0 text-[0.7rem] font-medium tabular-nums text-accent">
                        {review.rating}/10
                      </span>
                    </div>
                    {review.mangaTitle ? (
                      <p className="line-clamp-1 text-[0.65rem] text-surface-subtle">
                        on{" "}
                        <Link
                          href={`/manga/${review.mangaId}`}
                          className="text-surface-subtle transition-colors hover:text-accent"
                        >
                          &ldquo;{review.mangaTitle}&rdquo;
                        </Link>
                      </p>
                    ) : (
                      <Link
                        href={`/manga/${review.mangaId}`}
                        className="text-[0.65rem] italic text-surface-subtle transition-colors hover:text-accent"
                      >
                        view series
                      </Link>
                    )}
                  </div>
                </div>
                {review.body ? (
                  review.hasSpoilers ? (
                    <p className="pl-9 text-[0.65rem] italic text-surface-subtle/70">
                      (may contain spoilers)
                    </p>
                  ) : (
                    <p className="line-clamp-2 pl-9 text-[0.65rem] italic leading-snug text-white/55">
                      &ldquo;{review.body}&rdquo;
                    </p>
                  )
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NewsWidget({ items }: { items: NewsHeadline[] }) {
  return (
    <section className="space-y-2">
      <SectionHeading>News</SectionHeading>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group block text-[0.75rem] leading-snug text-surface-foreground transition-colors hover:text-accent"
              >
                <span className="line-clamp-2">{item.title}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.7rem] italic text-surface-subtle">
          News temporarily unavailable.
        </p>
      )}
      <p className="pt-1 text-[0.6rem] italic text-surface-subtle/70">
        via{" "}
        <a
          href="https://www.animenewsnetwork.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="not-italic text-surface-subtle transition-colors hover:text-accent"
        >
          Anime News Network
        </a>
      </p>
    </section>
  );
}
