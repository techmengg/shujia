import { MangaCarousel } from "@/components/manga/manga-carousel";
import { RecentlyUpdatedSection } from "@/components/manga/recently-updated-section";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import {
  getDemographicHighlights,
  getRecentlyUpdatedManga,
  getTrendingByOriginalLanguage,
} from "@/lib/mangadex/service";
import type { MangaSummary } from "@/lib/mangadex/types";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const userPromise = getCurrentUser();

  const trendsPromise = Promise.all([
    getTrendingByOriginalLanguage("ja", 16),
    getTrendingByOriginalLanguage("ko", 16),
    getTrendingByOriginalLanguage("zh", 16),
    getDemographicHighlights("shounen", 14),
    getDemographicHighlights("seinen", 14),
    getDemographicHighlights("shoujo", 14),
    getDemographicHighlights("josei", 14),
    getRecentlyUpdatedManga(49),
  ]);

  const [
    trendingManga,
    trendingManhwa,
    trendingManhua,
    shounenHighlights,
    seinenHighlights,
    shoujoHighlights,
    joseiHighlights,
    recentUpdates,
  ] = await trendsPromise;

  const user = await userPromise;

  const readingListEntries = user
    ? await prisma.readingListEntry.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 16,
      })
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
    coverImage: entry.coverImage ?? undefined,
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
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10 xl:px-12">
      <h1 className="sr-only">Shujia</h1>

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
        <div className="relative">
          <div
            className={[
              !user
                ? "pointer-events-none select-none blur-sm brightness-[0.65]"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MangaCarousel
              items={followedItems}
              emptyState={
                <p className="rounded-2xl border border-white/15 bg-black/80 px-4 py-6 text-center text-sm text-surface-subtle">
                  Follow series to see updates here.
                </p>
              }
            />
          </div>
          {!user ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-white/20 bg-black/75 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                Log in to view
              </div>
            </div>
          ) : null}
        </div>
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
  );
}
