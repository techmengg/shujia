import { SiteHeader } from "@/components/layout/site-header";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import { RecentlyUpdatedSection } from "@/components/manga/recently-updated-section";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import { READING_LIST } from "@/data/reading-list";
import {
  getDemographicHighlights,
  getRecentlyUpdatedManga,
  getTrendingByOriginalLanguage,
} from "@/lib/mangadex/service";
import type { MangaSummary } from "@/lib/mangadex/types";

export default async function Home() {
  const [
    trendingManga,
    trendingManhwa,
    trendingManhua,
    shounenHighlights,
    seinenHighlights,
    shoujoHighlights,
    joseiHighlights,
    recentUpdates,
  ] = await Promise.all([
    getTrendingByOriginalLanguage("ja", 16),
    getTrendingByOriginalLanguage("ko", 16),
    getTrendingByOriginalLanguage("zh", 16),
    getDemographicHighlights("shounen", 14),
    getDemographicHighlights("seinen", 14),
    getDemographicHighlights("shoujo", 14),
    getDemographicHighlights("josei", 14),
    getRecentlyUpdatedManga(49),
  ]);

  const followedSummaries: MangaSummary[] = READING_LIST.map((item) => {
    const timestamp = new Date(item.updatedAt).getTime();

    return {
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
      summary: {
        id: item.id,
        title: item.title,
        altTitles: [],
        description: item.notes,
        status: item.status,
        year: undefined,
        contentRating: undefined,
        demographic: item.demographic,
        latestChapter: undefined,
        languages: [],
        tags: item.tags,
        coverImage: item.cover,
        url: `https://mangadex.org/title/${item.id}`,
      } satisfies MangaSummary,
    };
  })
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => entry.summary)
    .slice(0, 16);

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
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10 xl:px-12">
        <h1 className="sr-only">ShujiaDB</h1>

        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
              Latest Updates from Your Followed List
            </h2>
            <a
              href="/reading-list"
              className="text-xs uppercase tracking-[0.3em] text-surface-subtle transition hover:text-white"
            >
              View list
            </a>
          </div>
          <MangaCarousel items={followedSummaries} />
        </section>

        {languageTabs.length ? (
          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
              Regions
            </h2>
            <TabbedCarousel tabs={languageTabs} />
          </section>
        ) : null}

        {demographicTabs.length ? (
          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
              Demographic
            </h2>
            <TabbedCarousel tabs={demographicTabs} />
          </section>
        ) : null}

        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white">
              Latest
            </h2>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-surface-subtle">
              <a
                href="https://mangadex.org/chapters"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                Chapters
              </a>
              <a
                href="https://mangadex.org/updates"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                Calendar
              </a>
            </div>
          </div>
          <RecentlyUpdatedSection initialItems={recentUpdates} pageSize={49} />
        </section>
      </main>
    </div>
  );
}
