import Link from "next/link";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import { RecentlyUpdatedSection } from "@/components/manga/recently-updated-section";
import { TabbedCarousel } from "@/components/manga/tabbed-carousel";
import {
  getDemographicHighlights,
  getPopularNewTitles,
  getRecentlyUpdatedManga,
  getRecentPopularByOriginalLanguage,
} from "@/lib/mangadex/service";
import type { MangaSummary } from "@/lib/mangadex/types";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }

  const userPromise = getCurrentUser();

  const trendsPromise = Promise.all([
    safe(getRecentPopularByOriginalLanguage("ja", 35), []),
    safe(getRecentPopularByOriginalLanguage("ko", 35), []),
    safe(getRecentPopularByOriginalLanguage("zh", 35), []),
    safe(getPopularNewTitles(35), []),
    safe(getDemographicHighlights("shounen", 35), []),
    safe(getDemographicHighlights("seinen", 35), []),
    safe(getDemographicHighlights("shoujo", 35), []),
    safe(getDemographicHighlights("josei", 35), []),
    safe(getRecentlyUpdatedManga(49), []),
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
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-4 pb-6 sm:px-6 lg:px-10 lg:pb-10">
      <h1 className="sr-only">Shujia</h1>

      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <h2 className="text-sm font-semibold text-white sm:text-lg">
            Latest Updates from Your Followed List
          </h2>
          <Link
            href="/reading-list"
            className="text-[0.7rem] uppercase tracking-[0.15em] text-surface-subtle transition hover:text-white sm:text-xs sm:tracking-[0.2em]"
          >
            View list
          </Link>
        </div>
        <div className="relative">
          <div
            className={[
              !user
                ? "pointer-events-none select-none opacity-60 grayscale"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="rounded-2xl border border-white/20 bg-black/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                <Link href="/login?redirect=/" className="transition hover:text-accent">
                  Log in to view
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

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
          <TabbedCarousel heading="Demographic Highlights" tabs={demographicTabs} />
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
