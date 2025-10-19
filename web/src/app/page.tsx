import { SiteHeader } from "@/components/layout/site-header";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import { MangaGrid } from "@/components/manga/manga-grid";
import { SearchBar } from "@/components/search/search-bar";
import {
  getRecentlyUpdatedManga,
  getTrendingByOriginalLanguage,
} from "@/lib/mangadex/service";

export default async function Home() {
  const [trendingManga, trendingManhwa, trendingManhua, recentUpdates] =
    await Promise.all([
      getTrendingByOriginalLanguage("ja", 12),
      getTrendingByOriginalLanguage("ko", 12),
      getTrendingByOriginalLanguage("zh", 12),
      getRecentlyUpdatedManga(60),
    ]);

  return (
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-[-16rem] z-0 h-[32rem] bg-gradient-to-b from-accent/25 via-transparent to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-72 bg-gradient-to-t from-black/70 via-surface/40 to-transparent" />

      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-10 lg:py-8 xl:px-12">
        <section className="rounded-3xl border border-white/6 bg-black/35 p-3 shadow-[0_0_25px_rgba(99,102,241,0.15)] sm:p-3.5 lg:p-4">
          <div className="flex flex-col items-center gap-2 text-center sm:gap-3 md:flex-row md:items-center md:gap-5 md:text-left">
            <div className="flex w-full flex-1">
              <SearchBar />
            </div>
            <div className="flex max-w-md flex-col gap-1.5 md:max-w-sm">
              <p className="text-xs uppercase tracking-[0.35em] text-accent">
                Pro tip
              </p>
              <p className="text-[0.68rem] text-surface-subtle sm:text-xs">
                Use the quick search panel to jump straight to any title on MangaDex.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-[0.6rem] text-surface-subtle sm:justify-start sm:text-[0.65rem]">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1">
                  Slash shortcut
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1">
                  Smart suggestions
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
          {[
            {
              id: "manhwa",
              overline: "Trending manhwa",
              title: "Korean webtoons gaining momentum",
              description:
                "Action-packed and romance-driven manhwa that readers can't put down.",
              items: trendingManhwa,
            },
            {
              id: "manga",
              overline: "Trending manga",
              title: "Japanese releases heating up",
              description:
                "Serialized manga pulling the highest follow counts this hour.",
              items: trendingManga,
            },
            {
              id: "manhua",
              overline: "Trending manhua",
              title: "Chinese series worth bookmarking",
              description:
                "Cultivation epics and modern dramas thriving on MangaDex.",
              items: trendingManhua,
            },
          ].map((section) => (
            <div key={section.id} className="space-y-2.5 sm:space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-accent">
                    {section.overline}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">
                    {section.title}
                  </h2>
                  <p className="mt-1 text-[0.7rem] text-surface-subtle sm:text-xs">
                    {section.description}
                  </p>
                </div>
                <a
                  href="https://mangadex.org/titles"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent transition hover:text-white"
                >
                  Browse all titles
                  <span aria-hidden>{"->"}</span>
                </a>
              </div>

              <MangaCarousel
                items={section.items}
                emptyState={
                  <p className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-surface-subtle">
                    We could not load trending series from MangaDex right now.
                    Check your network connection and try again later.
                  </p>
                }
              />
            </div>
          ))}
        </section>

        <section className="mt-10 space-y-5 sm:mt-12 sm:space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-accent">
                Recently updated
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Fresh chapters you might have missed
              </h2>
              <p className="mt-1 text-[0.75rem] text-surface-subtle sm:text-sm">
                The latest 60 series with new chapters from MangaDex across all
                regions.
              </p>
            </div>
            <a
              href="https://mangadex.org/chapters"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent transition hover:text-white"
            >
              View chapter feed
              <span aria-hidden>{"->"}</span>
            </a>
          </div>

          <MangaGrid
            items={recentUpdates}
            emptyState={
              <p className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-surface-subtle">
                We could not load recent updates from MangaDex right now. Try
                refreshing in a few moments.
              </p>
            }
          />
        </section>
      </main>
    </div>
  );
}
