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
