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

/** Levenshtein distance, lowercase normalized. Used by the loose matcher only. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Distance between an MD entry and an MU candidate using best-of (title or alt-titles). */
function bestTitleDistance(entry: ReadingListEntry, candidate: {
  title: string;
  altTitles: string[];
}): number {
  const mdTitle = normalizeTitle(entry.title);
  const muTitle = normalizeTitle(candidate.title);
  let best = mdTitle && muTitle ? levenshtein(mdTitle, muTitle) : Number.POSITIVE_INFINITY;

  const mdAlts = entry.altTitles.map(normalizeTitle).filter(Boolean);
  const muAlts = candidate.altTitles.map(normalizeTitle).filter(Boolean);
  for (const a of [mdTitle, ...mdAlts]) {
    if (!a) continue;
    for (const b of [muTitle, ...muAlts]) {
      if (!b) continue;
      const d = levenshtein(a, b);
      if (d < best) best = d;
    }
  }
  return best;
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
 * Looser MD->MU matcher for entries the strict pass couldn't promote.
 * Allows multi-candidate matches (picks lowest title-distance), tolerates
 * one-sided null years, and falls back to a Levenshtein <= 3 fuzzy match
 * when no exact normalized title overlaps. Use only for stragglers — the
 * strict matcher should run first.
 *
 * False-positive risk vs strict: low. Distance <= 3 catches romanization
 * and punctuation differences but not different sequels (e.g. "Berserk"
 * vs "Berserk: Black Swordsman" is distance >= 13).
 */
export async function tryMigrateEntryLoose(
  entry: ReadingListEntry,
): Promise<boolean> {
  if (entry.provider !== "mangadex") return false;

  try {
    const results = await mangaupdates.searchSeries(entry.title, { limit: 10 });
    if (!results.length) return false;

    let candidates = results.filter((r) => titleMatches(entry, r));

    if (!candidates.length) {
      candidates = results.filter((r) => bestTitleDistance(entry, r) <= 3);
    }

    if (!candidates.length) return false;

    // Year preference: if entry has a year, prefer candidates that match
    // (or have null year), but don't reject all candidates if none match.
    if (entry.year) {
      const compatible = candidates.filter(
        (c) => c.year === null || c.year === undefined || c.year === entry.year,
      );
      if (compatible.length) candidates = compatible;
    }

    // Pick the closest by best title distance (handles multi-candidate case).
    candidates.sort(
      (a, b) => bestTitleDistance(entry, a) - bestTitleDistance(entry, b),
    );
    const match = candidates[0];

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
    console.warn("tryMigrateEntryLoose failed", {
      userId: entry.userId,
      mangaId: entry.mangaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Third-pass MD->MU matcher: searches MU using each alt-title as its own
 * query, then runs the loose matcher's filter+tiebreak logic over the
 * combined dedup'd candidate pool. Catches entries where the main-title
 * search returned nothing (extreme romanization differences) but an
 * alt-title is in MU's index. False-positive risk = same as loose pass.
 */
export async function tryMigrateEntryByAltTitles(
  entry: ReadingListEntry,
): Promise<boolean> {
  if (entry.provider !== "mangadex") return false;
  if (!entry.altTitles.length) return false;

  const queries = entry.altTitles
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!queries.length) return false;

  try {
    type MuSummary = Awaited<ReturnType<typeof mangaupdates.searchSeries>>[number];
    const seen = new Map<string, MuSummary>();
    for (const q of queries) {
      const results = await mangaupdates.searchSeries(q, { limit: 5 });
      for (const r of results) {
        if (!seen.has(r.id)) seen.set(r.id, r);
      }
    }
    const candidates0 = Array.from(seen.values());
    if (!candidates0.length) return false;

    let candidates = candidates0.filter((r) => titleMatches(entry, r));
    if (!candidates.length) {
      candidates = candidates0.filter((r) => bestTitleDistance(entry, r) <= 3);
    }
    if (!candidates.length) return false;

    if (entry.year) {
      const compatible = candidates.filter(
        (c) => c.year === null || c.year === undefined || c.year === entry.year,
      );
      if (compatible.length) candidates = compatible;
    }

    candidates.sort(
      (a, b) => bestTitleDistance(entry, a) - bestTitleDistance(entry, b),
    );
    const match = candidates[0];

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
    console.warn("tryMigrateEntryByAltTitles failed", {
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
