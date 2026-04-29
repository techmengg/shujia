import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * Site-wide announcement bar. Currently only shown to logged-in users
 * who still have legacy MangaDex entries on their reading list (those
 * whose detail-page links 404 post-MD->MU migration). Server component
 * so the count is fresh on every page render — self-hides as the user
 * relinks remaining rows.
 */
export async function AnnouncementBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const mdCount = await prisma.readingListEntry.count({
    where: { userId: user.id, provider: "mangadex" },
  });
  if (mdCount === 0) return null;

  return (
    <div className="border-b border-white/10 bg-surface">
      <div className="mx-auto flex max-w-7xl items-baseline justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5 lg:px-10">
        <p className="min-w-0 text-[0.7rem] text-white/65 sm:text-xs">
          <span className="tabular-nums text-white/85">{mdCount}</span>{" "}
          {mdCount === 1 ? "entry" : "entries"} on your reading list{" "}
          {mdCount === 1 ? "is" : "are"} still on the old MangaDex source and{" "}
          {mdCount === 1 ? "won't" : "won't"} open when clicked.{" "}
          <span className="italic text-surface-subtle">
            Relink each to its MangaUpdates equivalent — your progress, ratings, and notes are kept.
          </span>
        </p>
        <Link
          href="/reading-list"
          className="group inline-flex shrink-0 items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
        >
          <span className="underline-offset-4 group-hover:underline">
            go to list
          </span>
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
