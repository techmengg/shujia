import Link from "next/link";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import { RecentlyUpdatedSection } from "@/components/manga/recently-updated-section";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import { FollowedListSection } from "@/components/home/followed-list-section";
import {
  getDemographicHighlights,
  getPopularNewTitles,
  getRecentlyUpdatedManga,
  getRecentPopularByOriginalLanguage,
} from "@/lib/mangadex/service-cached";
import type { MangaSummary } from "@/lib/mangadex/types";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// Enable Incremental Static Regeneration - regenerate every 5 minutes
export const revalidate = 300;

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
    safe(getRecentPopularByOriginalLanguage("ja", 50), []),
    safe(getRecentPopularByOriginalLanguage("ko", 50), []),
    safe(getRecentPopularByOriginalLanguage("zh", 50), []),
    safe(getPopularNewTitles(50), []),
    safe(getDemographicHighlights("shounen", 50), []),
    safe(getDemographicHighlights("seinen", 50), []),
    safe(getDemographicHighlights("shoujo", 50), []),
    safe(getDemographicHighlights("josei", 50), []),
    safe(getRecentlyUpdatedManga(59), []),
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
    recentUpdates,
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

  const followedSummaries: MangaSummary[] = readingListEntries.map((entry) => ({
    id: entry.mangaId,
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

      <FollowedListSection
        initialUser={Boolean(user)}
        followedItems={followedItems}
        placeholderItems={placeholderFollowedSummaries}
      />

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

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-semibold text-white sm:text-lg">
          Latest
        </h2>
        <RecentlyUpdatedSection initialItems={recentUpdates} pageSize={49} />
      </section>
    </main>
  );
}
