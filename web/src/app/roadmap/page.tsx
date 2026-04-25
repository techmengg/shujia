import type { Metadata } from "next";

type Status = "shipped" | "building" | "next" | "later";

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
    status: "shipped",
    heading: "Shipped",
    blurb: "live today",
    items: [
      {
        title: "Accounts that stay consistent",
        detail:
          "cookie sessions, google sign-in, email verification, 2fa with recovery codes.",
      },
      {
        title: "Reading list with progress, rating, notes",
        detail:
          "track any series you find. your list syncs across devices and is searchable.",
      },
      {
        title: "Discovery rails on the home page",
        detail:
          "trending (by origin country), popular new titles, recent releases, demographic tabs. sfw-filtered by default.",
      },
      {
        title: "Manga detail pages",
        detail:
          "covers, synopsis, authors, artists, tags, key facts, and one-click tracking.",
      },
      {
        title: "MangaUpdates + MangaDex metadata pipeline",
        detail:
          "unified provider layer. legacy entries auto-migrate to mangaupdates when a confident title match is found.",
      },
    ],
  },
  {
    status: "building",
    heading: "Building",
    blurb: "in progress right now",
    items: [
      {
        title: "Reading list statuses",
        detail:
          "reading / completed / on-hold / dropped / plan-to-read, the way mal and novelupdates do it.",
      },
      {
        title: "Public user profiles with stats",
        detail:
          "titles tracked, average rating, rating distribution, currently reading — a page you can share.",
      },
      {
        title: "Explore page filters",
        detail:
          "browse by genre, tag, year, publication status. sortable, paginated, shareable.",
      },
    ],
  },
  {
    status: "next",
    heading: "Up next",
    blurb: "the social + discovery layer",
    items: [
      {
        title: "Community reviews",
        detail:
          "write a review, rate individual categories (story, art, characters), surface the most recent and most helpful ones per series.",
      },
      {
        title: "Follow people, activity feed",
        detail:
          "see what the users you follow are reading, rating, and reviewing. lightweight, no noise.",
      },
      {
        title: "Recommendations",
        detail:
          "\"readers of X also liked…\" based on overlap in public reading lists. no ads, no black-box ranking.",
      },
      {
        title: "Add a manga (community submissions)",
        detail:
          "submit a title that isn't indexed yet. moderated so spam doesn't leak in.",
      },
      {
        title: "Import from MAL, AniList, MangaUpdates",
        detail:
          "bring your existing list over in one go. no re-tagging from scratch.",
      },
    ],
  },
  {
    status: "later",
    heading: "Later",
    blurb: "bigger swings, once the core is solid",
    items: [
      {
        title: "Series discussion threads",
        detail:
          "per-series comments with replies, spoiler tags, and light moderation tools.",
      },
      {
        title: "Character, creator, group pages",
        detail:
          "imdb-style sidebars: author bibliographies, scanlation group pages, character wikis.",
      },
      {
        title: "Collections and custom lists",
        detail:
          "hand-curated lists you can share (\"my top 10 seinen of the decade\", release schedules, etc).",
      },
      {
        title: "Anime expansion",
        detail:
          "jikan / anilist / consumet integration once the manga directory is stable.",
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
          shujia is building a community-driven directory for manga, manhwa,
          and manhua — think imdb / mal / novelupdates, but focused on comics
          first.
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
          const isShipped = section.status === "shipped";
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
                    <p
                      className={[
                        "text-sm font-semibold sm:text-[0.95rem]",
                        isShipped ? "text-white/80" : "text-white",
                      ].join(" ")}
                    >
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
