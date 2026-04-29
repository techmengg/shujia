import Link from "next/link";
import { after } from "next/server";

import { MangaCarousel } from "@/components/manga/manga-carousel";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import { FollowedSection } from "@/components/home/followed-section";
import {
  getPopularNewTitles,
  getRecentReleases,
  getTrendingByLanguage,
} from "@/lib/mangaupdates/service-cached";
import { migrateEntriesInBackground } from "@/lib/manga/migrate";
import type { MangaSummary, Provider } from "@/lib/manga/types";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// Home page has auth-dependent content, so force dynamic
export const dynamic = "force-dynamic";

interface RailHeaderProps {
  label: string;
  note?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
}

function RailHeader({
  label,
  note,
  seeAllHref,
  seeAllLabel = "see all",
}: RailHeaderProps) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-4 sm:gap-3">
      <div className="flex min-w-0 items-baseline gap-1.5 sm:gap-3">
        <h2 className="truncate text-sm font-semibold text-white sm:text-base">
          {label}
        </h2>
        {note ? (
          <span className="shrink-0 text-[0.7rem] italic text-surface-subtle sm:text-xs">
            ({note})
          </span>
        ) : null}
      </div>
      {seeAllHref ? (
        <Link
          href={seeAllHref}
          className="group inline-flex shrink-0 items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
        >
          <span className="underline-offset-4 group-hover:underline">
            {seeAllLabel}
          </span>
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-surface-subtle">{children}</p>;
}

export default async function Home() {
  function coverUrl(url?: string | null): string | undefined {
    return url ?? undefined;
  }

  async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }

  const userPromise = getCurrentUser();

  const trendsPromise = Promise.all([
    safe(getTrendingByLanguage("ja", 50), []),
    safe(getTrendingByLanguage("ko", 50), []),
    safe(getTrendingByLanguage("zh", 50), []),
    safe(getPopularNewTitles(50), []),
    safe(getRecentReleases(50), []),
  ]);

  // Recent community reviews — distinct manga, most recent first
  const recentReviewsPromise = safe(
    prisma.review
      .findMany({
        where: { body: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { provider: true, mangaId: true },
      })
      .then((rows) => {
        const seen = new Set<string>();
        const unique: { provider: string; mangaId: string }[] = [];
        for (const r of rows) {
          const key = `${r.provider}:${r.mangaId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(r);
          if (unique.length >= 20) break;
        }
        return unique;
      })
      .then(async (unique) => {
        if (!unique.length) return [] as MangaSummary[];
        // Look up metadata from reading list entries (any user's — just need the cached fields)
        const entries = await prisma.readingListEntry.findMany({
          where: {
            OR: unique.map((u) => ({ provider: u.provider, mangaId: u.mangaId })),
          },
          distinct: ["provider", "mangaId"],
          orderBy: { updatedAt: "desc" },
        });
        const entryMap = new Map(
          entries.map((e) => [`${e.provider}:${e.mangaId}`, e]),
        );
        const summaries: MangaSummary[] = [];
        for (const u of unique) {
          const entry = entryMap.get(`${u.provider}:${u.mangaId}`);
          if (!entry) continue;
          summaries.push({
            id: entry.mangaId,
            provider: entry.provider as Provider,
            title: entry.title,
            altTitles: entry.altTitles,
            description: entry.description ?? undefined,
            status: entry.status ?? undefined,
            year: entry.year ?? undefined,
            contentRating: entry.contentRating ?? undefined,
            demographic: entry.demographic ?? undefined,
            latestChapter: entry.latestChapter ?? undefined,
            languages: entry.languages,
            tags: entry.tags,
            coverImage: coverUrl(entry.coverImage),
            url: entry.url,
          });
        }
        return summaries;
      }),
    [],
  );

  const [
    [
      trendingManga,
      trendingManhwa,
      trendingManhua,
      popularNewTitles,
      recentReleases,
    ],
    recentlyReviewed,
  ] = await Promise.all([trendsPromise, recentReviewsPromise]);

  const user = await userPromise;

  const readingListEntries = user
    ? await prisma.readingListEntry
        .findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 16,
        })
        .catch(() => [])
    : [];

  if (readingListEntries.length) {
    after(() => migrateEntriesInBackground(readingListEntries));
  }

  const followedSummaries: MangaSummary[] = readingListEntries.map((entry) => ({
    id: entry.mangaId,
    provider: entry.provider as Provider,
    title: entry.title,
    altTitles: entry.altTitles,
    description: entry.description ?? undefined,
    status: entry.status ?? undefined,
    year: entry.year ?? undefined,
    contentRating: entry.contentRating ?? undefined,
    demographic: entry.demographic ?? undefined,
    latestChapter: entry.latestChapter ?? undefined,
    languages: entry.languages,
    tags: entry.tags,
    coverImage: coverUrl(entry.coverImage),
    url: entry.url,
  }));

  const placeholderFollowedSummaries: MangaSummary[] = Array.from(
    { length: 8 },
    (_, index) => ({
      id: `placeholder-${index}`,
      provider: "mangadex" as const,
      title: "Hidden series",
      altTitles: [],
      description: undefined,
      status: undefined,
      year: undefined,
      contentRating: undefined,
      demographic: undefined,
      latestChapter: undefined,
      languages: [],
      tags: [],
      coverImage: undefined,
      url: "#",
    }),
  );

  const followedItems = user ? followedSummaries : placeholderFollowedSummaries;

  const languageTabs = [
    {
      id: "kr",
      label: "Manhwa (KR)",
      items: trendingManhwa,
    },
    {
      id: "jp",
      label: "Manga (JP)",
      items: trendingManga,
    },
    {
      id: "cn",
      label: "Manhua (CN)",
      items: trendingManhua,
    },
  ].filter((tab) => tab.items.length > 0);

  const homeStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://shujia.dev/#website",
    url: "https://shujia.dev/",
    name: "shujia",
    alternateName: "shujia.dev",
    description:
      "Track manga, manhwa, and manhua. Discover series, rate them, build your reading list, and follow other readers.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://shujia.dev/explore?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <h1 className="sr-only">
        shujia — manga, manhwa, and manhua tracker
      </h1>

      <FollowedSection followedItems={followedItems} />

      {languageTabs.length ? (
        <section className="mt-6 sm:mt-8">
          <TabbedCarousel heading="Trending" tabs={languageTabs} />
        </section>
      ) : null}

      {popularNewTitles.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader label="Popular New Titles" seeAllHref="/explore" />
          <MangaCarousel
            items={popularNewTitles}
            emptyState={
              <EmptyLine>
                Could not load new titles right now — try again in a moment.
              </EmptyLine>
            }
          />
        </section>
      ) : null}

      {recentlyReviewed.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader label="Recently Reviewed" />
          <MangaCarousel
            items={recentlyReviewed}
            emptyState={
              <EmptyLine>No recently reviewed titles right now.</EmptyLine>
            }
          />
        </section>
      ) : null}

      {recentReleases.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader label="Recent Releases" seeAllHref="/explore" />
          <MangaCarousel
            items={recentReleases}
            emptyState={
              <EmptyLine>No recent releases available right now.</EmptyLine>
            }
          />
        </section>
      ) : null}
    </main>
  );
}
