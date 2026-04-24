import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a Manga — Coming Soon",
  description:
    "Community submissions for new manga, manhwa, and manhua entries are on the way.",
};

export default function AddMangaPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/60">
        Coming soon
      </span>

      <h1 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
        Add a manga to shujia
      </h1>

      <p className="mt-4 max-w-xl text-sm text-white/65 sm:text-base">
        Community submissions for new titles — manga, manhwa, manhua, novels —
        are on the roadmap. For now, you can browse what&apos;s already indexed
        from MangaUpdates and MangaDex.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/explore"
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/20"
        >
          Browse what&apos;s here
        </Link>
        <Link
          href="/roadmap"
          className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:bg-white/10"
        >
          See the roadmap
        </Link>
        <a
          href="https://github.com/techmengg/shujia/issues"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:bg-white/10"
        >
          Request a title
        </a>
      </div>
    </main>
  );
}
