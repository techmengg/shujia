import type { ReadingListEntry } from "@prisma/client";
import * as mangaupdates from "@/lib/mangaupdates/service";
import { prisma } from "@/lib/prisma";

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatches(entry: ReadingListEntry, candidate: {
  title: string;
  altTitles: string[];
}): boolean {
  const mdTitle = normalizeTitle(entry.title);
  const muTitle = normalizeTitle(candidate.title);
  if (mdTitle && mdTitle === muTitle) return true;

  const mdAlts = entry.altTitles.map(normalizeTitle).filter(Boolean);
  const muAlts = candidate.altTitles.map(normalizeTitle).filter(Boolean);

  return (
    mdAlts.includes(muTitle) ||
    muAlts.includes(mdTitle) ||
    mdAlts.some((a) => muAlts.includes(a))
  );
}

/**
 * Attempts to migrate a MangaDex ReadingListEntry to a MangaUpdates equivalent.
 * High-confidence only: exact normalized-title match (or alt-title match) AND
 * matching year if both sides have one. User-owned fields are preserved.
 * Returns true if migrated, false if not.
 * Never throws — logs and returns false on any failure.
 */
export async function tryMigrateEntryToMangaUpdates(
  entry: ReadingListEntry,
): Promise<boolean> {
  if (entry.provider !== "mangadex") return false;

  try {
    const results = await mangaupdates.searchSeries(entry.title, { limit: 5 });
    if (!results.length) return false;

    const matches = results.filter((r) => titleMatches(entry, r));
    if (matches.length !== 1) return false;

    const match = matches[0];
    if (entry.year && match.year && entry.year !== match.year) return false;

    await prisma.$transaction(async (tx) => {
      await tx.readingListEntry.upsert({
        where: {
          userId_provider_mangaId: {
            userId: entry.userId,
            provider: "mangaupdates",
            mangaId: match.id,
          },
        },
        create: {
          userId: entry.userId,
          provider: "mangaupdates",
          mangaId: match.id,
          title: match.title,
          altTitles: match.altTitles,
          description: match.description ?? null,
          status: match.status ?? null,
          year: match.year ?? null,
          contentRating: match.contentRating ?? null,
          demographic: match.demographic ?? null,
          latestChapter: match.latestChapter ?? null,
          languages: match.languages,
          tags: match.tags,
          coverImage: match.coverImage ?? null,
          url: match.url,
          progress: entry.progress,
          rating: entry.rating,
          notes: entry.notes,
          createdAt: entry.createdAt,
        },
        update: {
          // Preserve any already-present MU entry fields; only fill blanks
          ...(entry.progress ? { progress: entry.progress } : {}),
          ...(entry.rating !== null ? { rating: entry.rating } : {}),
          ...(entry.notes ? { notes: entry.notes } : {}),
        },
      });

      await tx.readingListEntry.deleteMany({
        where: {
          userId: entry.userId,
          provider: "mangadex",
          mangaId: entry.mangaId,
        },
      });
    });

    return true;
  } catch (error) {
    console.warn("tryMigrateEntryToMangaUpdates failed", {
      userId: entry.userId,
      mangaId: entry.mangaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Best-effort background migration for a batch of entries.
 * Fire-and-forget from API routes; never awaited.
 */
export function migrateEntriesInBackground(entries: ReadingListEntry[]): void {
  const md = entries.filter((e) => e.provider === "mangadex");
  if (!md.length) return;

  // Cap parallelism to avoid hammering MU
  const CONCURRENCY = 3;
  let index = 0;

  async function worker() {
    while (index < md.length) {
      const entry = md[index++];
      await tryMigrateEntryToMangaUpdates(entry);
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, md.length) },
    () => worker(),
  );

  // Intentionally not awaited; swallow any worker failures
  Promise.allSettled(workers).catch(() => {});
}
