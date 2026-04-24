import { after } from "next/server";

import { MangaCarousel } from "@/components/manga/manga-carousel";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import { FollowedSection } from "@/components/home/followed-section";
import { getDemographicHighlights } from "@/lib/mangadex/service-cached";
import {
  getPopularNewTitles,
  getRecentReleases,
  getRecentlyReviewedSeries,
  getTrendingByLanguage,
} from "@/lib/mangaupdates/service-cached";
import { migrateEntriesInBackground } from "@/lib/manga/migrate";
import type { MangaSummary, Provider } from "@/lib/mangadex/types";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// Home page has auth-dependent content, so force dynamic
export const dynamic = "force-dynamic";

export default async function Home() {
  function toProxyCoverUrl(mangaId: string, url?: string | null): string | undefined {
    if (!url) return undefined;

    try {
      // If already using our proxy, normalize to size=256
      if (url.startsWith("/api/images/cover")) {
        const u = new URL(url, "http://localhost"); // base is ignored for path parsing
        u.searchParams.set("mangaId", mangaId);
        u.searchParams.set("size", "256");
        return `${u.pathname}?${u.searchParams.toString()}`;
      }

      const parsed = new URL(url);
      const isUploads =
        parsed.hostname === "uploads.mangadex.org" ||
        parsed.hostname === "uploads-cdn.mangadex.org" ||
        parsed.hostname === "mangadex.org";

      if (!isUploads) {
        // For any other host, leave as-is.
        return url;
      }

      const segments = parsed.pathname.split("/").filter(Boolean);
      const fileSegment = segments[segments.length - 1] ?? "";
      // Strip sized suffix if present: .256.jpg or .512.jpg
      const originalFile = fileSegment.replace(/\.256\.jpg$|\.512\.jpg$/i, "");

      const params = new URLSearchParams({
        mangaId,
        file: originalFile,
        size: "256",
      });

      return `/api/images/cover?${params.toString()}`;
    } catch {
      return url ?? undefined;
    }
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
    safe(getDemographicHighlights("shounen", 50), []),
    safe(getDemographicHighlights("seinen", 50), []),
    safe(getDemographicHighlights("shoujo", 50), []),
    safe(getDemographicHighlights("josei", 50), []),
    safe(getRecentReleases(50), []),
    safe(getRecentlyReviewedSeries(30), []),
  ]);

  const [
    trendingManga,
    trendingManhwa,
    trendingManhua,
    popularNewTitles,
    shounenHighlights,
    seinenHighlights,
    shoujoHighlights,
    joseiHighlights,
    recentReleases,
    recentlyReviewed,
  ] = await trendsPromise;

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
    coverImage: toProxyCoverUrl(entry.mangaId, entry.coverImage),
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

  const demographicTabs = [
    {
      id: "shounen",
      label: "Shounen",
      items: shounenHighlights,
    },
    {
      id: "seinen",
      label: "Seinen",
      items: seinenHighlights,
    },
    {
      id: "shoujo",
      label: "Shoujo",
      items: shoujoHighlights,
    },
    {
      id: "josei",
      label: "Josei",
      items: joseiHighlights,
    },
  ].filter((tab) => tab.items.length > 0);

  return (
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-4 pb-6 sm:px-6 lg:px-10 lg:pb-10">
      <h1 className="sr-only">Shujia</h1>

      <FollowedSection followedItems={followedItems} />

      {languageTabs.length ? (
        <section className="mt-10 space-y-4">
          <TabbedCarousel heading="Trending" tabs={languageTabs} />
        </section>
      ) : null}

      {popularNewTitles.length ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold text-white sm:text-lg">
            Popular New Titles
          </h2>
          <MangaCarousel
            items={popularNewTitles}
            emptyState={
              <p className="rounded-2xl border border-white/10 bg-[#0d0122]/70 p-6 text-sm text-surface-subtle">
                We could not load popular new releases right now. Try again in a
                moment.
              </p>
            }
          />
        </section>
      ) : null}

      {demographicTabs.length ? (
        <section className="mt-10 space-y-4">
          <TabbedCarousel heading="Demographic" tabs={demographicTabs} />
        </section>
      ) : null}

      {recentReleases.length ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold text-white sm:text-lg">
            Recent Releases
          </h2>
          <MangaCarousel
            items={recentReleases}
            emptyState={
              <p className="rounded-2xl border border-white/10 bg-[#0d0122]/70 p-6 text-sm text-surface-subtle">
                No recent releases available right now.
              </p>
            }
          />
        </section>
      ) : null}

      {recentlyReviewed.length ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold text-white sm:text-lg">
            Recently Reviewed
          </h2>
          <MangaCarousel
            items={recentlyReviewed}
            emptyState={
              <p className="rounded-2xl border border-white/10 bg-[#0d0122]/70 p-6 text-sm text-surface-subtle">
                No recent reviews available right now.
              </p>
            }
          />
        </section>
      ) : null}
    </main>
  );
}
