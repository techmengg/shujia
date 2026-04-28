import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth/session";
import { normalizeStatus } from "@/lib/manga/status";
import { getComicsNews, type NewsHeadline } from "@/lib/news/animenewsnetwork";
import { prisma } from "@/lib/prisma";

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
  const [viewer, news] = await Promise.all([getCurrentUser(), getComicsNews()]);

  let userData: {
    username: string;
    continueReading: ReadingEntry | null;
    recentRated: ReadingEntry[];
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
    const rated = entries.filter(
      (e): e is ReadingEntry & { rating: number } => typeof e.rating === "number",
    );

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
      recentRated: rated.slice(0, 3),
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

          {userData.recentRated.length > 0 ? (
            <RecentRatedWidget items={userData.recentRated} />
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

function RecentRatedWidget({ items }: { items: ReadingEntry[] }) {
  return (
    <section className="space-y-2">
      <SectionHeading>Recently rated</SectionHeading>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/manga/${item.mangaId}`}
              className="group flex items-baseline justify-between gap-2 text-[0.8rem] transition-colors hover:text-accent"
            >
              <span className="line-clamp-1 min-w-0 flex-1 text-white">{item.title}</span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-accent">
                {item.rating?.toFixed(1)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
