import type { Metadata } from "next";

type Status = "building" | "next" | "later";

interface RoadmapItem {
  title: string;
  detail?: string;
}

interface RoadmapSection {
  status: Status;
  heading: string;
  blurb: string;
  items: RoadmapItem[];
}

const sections: RoadmapSection[] = [
  {
    status: "building",
    heading: "Building",
    blurb: "in progress right now",
    items: [
      {
        title: "Recommendations (\"readers of X also liked\")",
        detail:
          "find similar series based on overlap in public reading lists. no ads, no black-box ranking.",
      },
      {
        title: "Re-enable the home \"Followed\" rail",
        detail:
          "the section is parked while the design is being reworked — bringing it back so the people you follow surface the series they're tracking front-and-center.",
      },
    ],
  },
  {
    status: "next",
    heading: "Up next",
    blurb: "queued, scoped, not yet started",
    items: [
      {
        title: "Series ranking & leaderboards",
        detail:
          "global top-100 by community rating, by genre, by year. a way to find canonical greats without trusting a single algorithm.",
      },
      {
        title: "Recommendation lists",
        detail:
          "user-curated lists with writeups (\"my top 10 seinen of the decade\", \"best one-shots\"). different from algorithmic recs in that the focus is on the human take.",
      },
      {
        title: "Per-series discussion threads",
        detail:
          "comments per series with replies, spoiler tags, and light moderation tools.",
      },
      {
        title: "Richer review UX",
        detail:
          "per-category ratings (story, art, characters), helpful-sorting, longer-form review templates.",
      },
      {
        title: "Community series submissions",
        detail:
          "submit a title that isn't indexed yet. moderated so spam doesn't leak in.",
      },
      {
        title: "Import from AniList",
        detail:
          "MAL XML import already works; AniList is next.",
      },
    ],
  },
  {
    status: "later",
    heading: "Later",
    blurb: "bigger swings, once the core is solid",
    items: [
      {
        title: "Community forum",
        detail:
          "general-purpose discussion threads — recommendations, news, off-topic. distinct from the per-series threads above.",
      },
      {
        title: "Character, creator, group pages",
        detail:
          "imdb-style sidebars: author bibliographies, scanlation group pages, character wikis.",
      },
      {
        title: "Anime expansion",
        detail:
          "jikan / anilist / consumet integration once the manga directory is stable. eventually tv + dramas.",
      },
      {
        title: "Public API + developer docs",
        detail:
          "once the data model is steady, open it up so other tools can build on shujia.",
      },
      {
        title: "Mobile app / PWA",
        detail:
          "offline reading-list access and push for new chapters of tracked series.",
      },
      {
        title: "Self-hosted catalog",
        detail:
          "once enough users have submitted titles, written reviews, and corrected metadata, shujia can stand on its own data instead of leaning on the MangaUpdates api as the primary source. MU stays as a backfill / cross-reference, but the canonical record lives in shujia's db.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10 lg:px-10">
      <header className="space-y-3 sm:space-y-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Roadmap
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-surface-subtle sm:text-base">
          shujia is a community-driven directory and tracker for manga, manhwa,
          and manhua — think imdb / mal / letterboxd, but focused on comics
          first. this page tracks what&apos;s coming, not what&apos;s already
          done — the app itself is the proof of what&apos;s shipped.
        </p>
        <p className="text-[0.7rem] italic text-surface-subtle/70 sm:text-xs">
          built by one person, so timelines are fuzzy by design.
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[0.7rem] text-surface-subtle sm:text-xs">
          {sections.map((section, index) => (
            <span key={section.status} className="inline-flex items-baseline gap-1">
              <span
                className={
                  section.status === "building"
                    ? "font-semibold text-accent"
                    : "font-semibold text-white/70"
                }
              >
                {section.items.length}
              </span>
              <span>{section.heading.toLowerCase()}</span>
              {index < sections.length - 1 ? (
                <span aria-hidden className="text-surface-subtle/40">
                  ·
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
        {sections.map((section) => {
          const isBuilding = section.status === "building";
          return (
            <section key={section.status}>
              <div
                className={[
                  "mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b pb-2 sm:mb-4",
                  isBuilding ? "border-accent/60" : "border-white/15",
                ].join(" ")}
              >
                <h2 className="text-sm font-semibold text-white sm:text-base">
                  {section.heading}
                </h2>
                <span className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
                  — {section.blurb}
                </span>
              </div>

              <ul className="divide-y divide-white/10">
                {section.items.map((item) => (
                  <li key={item.title} className="py-3">
                    <p className="text-sm font-semibold text-white sm:text-[0.95rem]">
                      {item.title}
                    </p>
                    {item.detail ? (
                      <p className="mt-0.5 text-[0.8rem] leading-relaxed text-surface-subtle sm:text-sm">
                        {item.detail}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="mt-12 border border-accent/40 px-4 py-5 sm:mt-14 sm:px-6 sm:py-6">
        <div className="space-y-1.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent sm:text-[0.7rem]">
            end-state architecture
          </p>
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Shujia-canonical catalog with external-source mappings
          </h2>
          <p className="text-[0.8rem] leading-relaxed text-surface-subtle sm:text-sm">
            today every series in shujia is keyed on
            {" "}
            <code className="font-mono text-[0.75em] text-white/80">(provider, externalId)</code>
            {" "}— effectively &ldquo;wherever MangaUpdates sent us.&rdquo; that&apos;s
            fine for the current scale, but it means a single upstream
            outage breaks every reading list, and there&apos;s no way to
            merge metadata from MangaBaka, AniList, MangaDex, or MAL
            without messy conflicts. the long-term commitment is to make
            <em> shujia&apos;s db</em> the canonical record for every
            series, with each external source treated as a backfill /
            cross-reference rather than the source of truth.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="inline-flex items-baseline gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-accent sm:text-[0.7rem]">
                <span className="inline-block h-1 w-1 translate-y-[-1px] bg-accent" aria-hidden />
                phase 1
              </span>
              <span className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
                lazy-populated MangaSeries table
              </span>
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-surface-subtle sm:text-sm">
              add a{" "}
              <code className="font-mono text-[0.75em] text-white/80">MangaSeries</code>
              {" "}table keyed by a shujia
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">cuid</code>
              {" "}with nullable external-id columns (
              <code className="font-mono text-[0.75em] text-white/80">muId</code>,
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">mbId</code>,
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">anilistId</code>,
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">mdId</code>,
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">malId</code>
              ) and snapshot fields (title, cover, year, type, status,
              tags). populate lazily — when someone visits
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">/manga/&lt;mu-id&gt;</code>
              {" "}we upsert the row, store the MU id + snapshot, return
              the shujia cuid. user-facing tables (ReadingListEntry,
              Review, ReviewReaction, MangaPageView) stay keyed on
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">(provider, mangaId)</code>
              {" "}— zero migration risk on live data.
            </p>
            <p className="mt-1.5 text-[0.75rem] italic text-surface-subtle/80 sm:text-[0.8rem]">
              unlocks: faster repeat lookups (no external API hop for
              hot series), foundation for cross-source merging, the data
              model the resolver in phase 2 needs.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="inline-flex items-baseline gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-accent sm:text-[0.7rem]">
                <span className="inline-block h-1 w-1 translate-y-[-1px] bg-accent" aria-hidden />
                phase 2
              </span>
              <span className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
                resolver + new-feature usage
              </span>
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-surface-subtle sm:text-sm">
              add a resolver{" "}
              <code className="font-mono text-[0.75em] text-white/80">
                (provider, externalId) → shujiaId
              </code>
              {" "}backed by the MangaSeries lookup. new features start
              consuming shujia ids natively: AniList import maps via
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">anilistId</code>,
              recommendations join through MangaSeries, the sitemap
              canonicalizes one URL per series regardless of how many
              external ids point at it. user-facing tables get a
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">shujiaSeriesId</code>
              {" "}foreign-key column, but the existing
              {" "}
              <code className="font-mono text-[0.75em] text-white/80">(provider, mangaId)</code>
              {" "}stays — backfilled in the background, no
              cutover.
            </p>
            <p className="mt-1.5 text-[0.75rem] italic text-surface-subtle/80 sm:text-[0.8rem]">
              unlocks: AniList / MAL imports, cross-source
              recommendations, deduplication when MU and MB index the
              same series under different titles.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="inline-flex items-baseline gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-accent sm:text-[0.7rem]">
                <span className="inline-block h-1 w-1 translate-y-[-1px] bg-accent" aria-hidden />
                phase 3
              </span>
              <span className="text-[0.7rem] italic text-surface-subtle sm:text-xs">
                user-facing migration to shujia ids
              </span>
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-surface-subtle sm:text-sm">
              once mappings are dense and stable, flip the user-facing
              schema. ReadingListEntry / Review / ReviewReaction /
              MangaPageView use{" "}
              <code className="font-mono text-[0.75em] text-white/80">shujiaSeriesId</code>
              {" "}as primary;{" "}
              <code className="font-mono text-[0.75em] text-white/80">(provider, mangaId)</code>
              {" "}gets demoted to a legacy column kept for backwards
              compatibility. external sources become pure backfill —
              MU, MB, AniList, MD, MAL all feed the same canonical
              record. community submissions and metadata corrections
              write directly to MangaSeries.
            </p>
            <p className="mt-1.5 text-[0.75rem] italic text-surface-subtle/80 sm:text-[0.8rem]">
              unlocks: shujia survives any single upstream going down,
              full self-hosted catalog, community-maintained metadata
              with version history.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[0.7rem] italic text-surface-subtle/80 sm:text-[0.75rem]">
            why staged: a single-cutover migration on a live db is a
            1-2 week risk window with no rollback. phase 1 alone
            unblocks ~80% of the value (AniList import, recs, faster
            lookups) and ships in days. phase 2 + 3 only happen once
            phase 1 has populated enough mappings to make them
            worthwhile.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t border-white/10 pt-5 text-[0.7rem] text-surface-subtle sm:text-xs">
        <p>
          feedback or title request?{" "}
          <a
            href="https://github.com/techmengg/shujia/issues"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            open an issue
          </a>{" "}
          or dm on x:{" "}
          <a
            href="https://x.com/s4lvaholic"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            @s4lvaholic
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Roadmap",
};
