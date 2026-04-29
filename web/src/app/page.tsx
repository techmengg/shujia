import Link from "next/link";
import { after } from "next/server";

import { MangaCarousel } from "@/components/manga/manga-carousel";
// import { FollowedSection } from "@/components/home/followed-section";
import { FollowingActivitySection } from "@/components/home/following-activity-section";
import { MostTrackedSection } from "@/components/home/most-tracked-section";
import { NewsSection } from "@/components/home/news-section";
import { getRecentReleases } from "@/lib/mangaupdates/service-cached";
import { getFollowingActivity } from "@/lib/home/following-activity";
import { getMostTracked } from "@/lib/home/most-tracked";
import { getNewReleases } from "@/lib/home/new-releases";
import { getReaderTrending } from "@/lib/home/reader-trending";
import { getHomeNews } from "@/lib/home/news";
import { migrateEntriesInBackground } from "@/lib/manga/migrate";
// import type { MangaSummary, Provider } from "@/lib/manga/types";
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
    <div className="mb-3 flex items-baseline justify-between gap-2 sm:mb-4 sm:gap-3">
      <div className="flex min-w-0 items-baseline gap-1.5 sm:gap-3">
        <h2 className="truncate text-base font-semibold text-white sm:text-lg">
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
  // Helper kept here for re-enabling the FollowedSection block below.
  // function coverUrl(url?: string | null): string | undefined {
  //   return url ?? undefined;
  // }

  async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }

  const userPromise = getCurrentUser();

  const trendsPromise = Promise.all([
    safe(getReaderTrending(), []),
    safe(getRecentReleases(50), []),
  ]);

  const mostTrackedPromise = safe(getMostTracked(), []);
  const newReleasesPromise = safe(getNewReleases(), []);
  const newsPromise = safe(getHomeNews(), []);

  // Resolve the viewer FIRST so we know whether to fetch follow-activity.
  const user = await userPromise;

  const followingActivityPromise = user
    ? safe(getFollowingActivity(user.id), [])
    : Promise.resolve([]);

  const [
    [trending, recentReleases],
    mostTracked,
    newReleases,
    news,
    followingActivity,
  ] = await Promise.all([
    trendsPromise,
    mostTrackedPromise,
    newReleasesPromise,
    newsPromise,
    followingActivityPromise,
  ]);

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

  // FollowedSection on home is temporarily disabled — the data
  // derivation is parked here for the moment so re-enabling is a
  // single-block uncomment. Restore the import + the JSX render
  // alongside this block to bring the section back.
  /*
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
  */

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

      {/* Temporarily hidden — re-enable when ready.
      <FollowedSection followedItems={followedItems} />
      */}

      <section>
        <RailHeader label="News" note="from r/manhwa + Anime News Network" />
        <NewsSection items={news} />
      </section>

      {trending.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader
            label="Trending"
            note="most-discussed this week on r/manga + r/manhwa"
            seeAllHref="/explore"
          />
          <MangaCarousel
            items={trending}
            emptyState={
              <EmptyLine>
                Could not load trending right now — try again in a moment.
              </EmptyLine>
            }
          />
        </section>
      ) : null}

      {newReleases.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader
            label="New releases"
            note="started publishing in the last year"
            seeAllHref="/explore"
          />
          <MangaCarousel
            items={newReleases}
            emptyState={
              <EmptyLine>No new releases right now — try again shortly.</EmptyLine>
            }
          />
        </section>
      ) : null}

      {user ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader label="From people you follow" />
          <FollowingActivitySection
            items={followingActivity}
            isAuthenticated={true}
          />
        </section>
      ) : null}

      {mostTracked.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader label="Most tracked on ShjDB" seeAllHref="/explore" />
          <MostTrackedSection items={mostTracked} />
        </section>
      ) : null}

      {recentReleases.length ? (
        <section className="mt-6 sm:mt-8">
          <RailHeader label="Latest chapters" seeAllHref="/explore" />
          <MangaCarousel
            items={recentReleases}
            emptyState={
              <EmptyLine>No new chapters in the last few days.</EmptyLine>
            }
          />
        </section>
      ) : null}
    </main>
  );
}
