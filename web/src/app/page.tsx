import { MangaCarousel } from "@/components/manga/manga-carousel";
import { RecentlyUpdatedSection } from "@/components/manga/recently-updated-section";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import { FollowedSection } from "@/components/home/followed-section";
import { TrendingCarousel } from "@/components/home/trending-carousel";
import {
  getDemographicHighlights,
  getPopularNewTitles,
  getRecentlyUpdatedManga,
  getRecentPopularByOriginalLanguage,
} from "@/lib/manga-service";
import type { MangaSummary } from "@/lib/mangaupdates/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserAdultContentPreferences } from "@/lib/user-preferences";
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
        parsed.hostname.includes("mangaupdates.com");

      if (!isUploads) {
        // For any other host, leave as-is.
        return url;
      }

      // MangaUpdates provides full image URLs, just proxy them
      const params = new URLSearchParams({
        url: url,
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
  
  // Get user's 3-tier adult content preferences
  const prefs = await getUserAdultContentPreferences();

  // Smart Mix: 80% Korean action/adventure/romance, 10% Japanese, 10% Chinese
  const trendsPromise = Promise.all([
    safe(getRecentPopularByOriginalLanguage("ja", 10, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getRecentPopularByOriginalLanguage("ko", 80, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getRecentPopularByOriginalLanguage("zh", 10, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getPopularNewTitles(50, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getDemographicHighlights("Manga", 50, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getDemographicHighlights("Manhwa", 50, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getDemographicHighlights("Manhua", 50, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getDemographicHighlights("Novel", 50, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
    safe(getRecentlyUpdatedManga(59, 0, prefs.showMatureContent, prefs.showExplicitContent, prefs.showPornographicContent), []),
  ]);

  const [
    trendingMangaRaw,
    trendingManhwaRaw,
    trendingManhuaRaw,
    popularNewTitles,
    mangaHighlights,
    manhwaHighlights,
    manhuaHighlights,
    novelHighlights,
    recentUpdates,
  ] = await trendsPromise;

  // Pre-process trending data with proxied cover URLs
  const trendingManga = trendingMangaRaw.slice(0, 5).map(item => ({
    ...item,
    coverImage: toProxyCoverUrl(item.id, item.coverImage),
  }));
  
  // Filter Korean content for action/adventure/romance genres (Smart Mix priority)
  const trendingManhwa = trendingManhwaRaw
    .filter(item => {
      const tags = (item.tags || []).map((tag: string) => tag.toLowerCase());
      return tags.some((tag: string) => 
        tag.includes('action') || 
        tag.includes('adventure') || 
        tag.includes('romance') ||
        tag.includes('fantasy') ||
        tag.includes('drama')
      );
    })
    .map(item => ({
      ...item,
      coverImage: toProxyCoverUrl(item.id, item.coverImage),
    }));
  
  const trendingManhua = trendingManhuaRaw.slice(0, 5).map(item => ({
    ...item,
    coverImage: toProxyCoverUrl(item.id, item.coverImage),
  }));

  // Combine all trending data: 80% Korean (action/adventure/romance), 20% others
  const allTrending = [
    ...trendingManhwa,
    ...trendingManga,
    ...trendingManhua,
  ].sort(() => Math.random() - 0.5); // Light shuffle for variety

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

  const demographicTabs = [
    {
      id: "manga",
      label: "Manga",
      items: mangaHighlights,
    },
    {
      id: "manhwa",
      label: "Manhwa",
      items: manhwaHighlights,
    },
    {
      id: "manhua",
      label: "Manhua",
      items: manhuaHighlights,
    },
    {
      id: "novel",
      label: "Novel",
      items: novelHighlights,
    },
  ].filter((tab) => tab.items.length > 0);

  return (
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-4 pb-6 sm:px-6 lg:px-10 lg:pb-10">
      <h1 className="sr-only">Shujia</h1>

      <FollowedSection followedItems={followedItems} />

      {allTrending.length > 0 && (
        <section className="mt-10">
          <TrendingCarousel
            initialData={allTrending}
            userPrefs={prefs}
          />
        </section>
      )}

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
