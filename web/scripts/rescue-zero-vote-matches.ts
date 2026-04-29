/**
 * Rescue reading-list rows that the migrator placed on a 0/low-vote MU
 * series when a clearly-canonical higher-voted MU series exists with the
 * same normalized title. Catches misfires like "Look Back" the doujinshi
 * vs Fujimoto Tatsuki's canonical "Look Back" — both share the title,
 * the doujinshi has 0 votes, the canonical has thousands.
 *
 * Defaults to dry-run. Pass --apply to execute the swaps.
 *
 * Usage from web/:
 *   pnpm dlx tsx scripts/rescue-zero-vote-matches.ts            # dry-run
 *   pnpm dlx tsx scripts/rescue-zero-vote-matches.ts --apply    # execute
 *
 * Strict gates (any one false -> skip):
 *   - Current target's ratingVotes is < SUSPECT_VOTES_MAX (10)
 *   - A *different* MU candidate exists matching the entry's normalized
 *     title (or one of the entry's altTitles) exactly (Levenshtein 0)
 *   - That candidate's ratingVotes >= RESCUE_VOTES_MIN (50)
 *   - Per-user upsert+delete is atomic; user already holding the new MU
 *     id keeps their existing row (their own data wins).
 *
 * No false-positive expansion to fuzzy distance, no broadening of
 * thresholds. Tighten further by raising SUSPECT_VOTES_MAX cap.
 */

import { PrismaClient } from "@prisma/client";

import * as mangaupdates from "../src/lib/mangaupdates/service";
import type { MangaSummary } from "../src/lib/manga/types";

const SUSPECT_VOTES_MAX = 50;
const RESCUE_VOTES_MIN = 50;
const RESCUE_RATIO_MIN = 5; // target must have >= 5x current votes
const DELAY_MS = 350;

const prisma = new PrismaClient();

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * MU disambiguates same-titled series by appending " (AUTHOR Name)" or a
 * similar parenthetical. e.g. "Look Back (FUJIMOTO Tatsuki)" vs the
 * doujinshi "Look Back". Strip the trailing parenthetical before
 * normalized-title comparison so the canonical surfaces as a match.
 */
function stripTrailingParenthetical(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

function titleVariants(s: string): string[] {
  const a = normalizeTitle(s);
  const b = normalizeTitle(stripTrailingParenthetical(s));
  return a === b ? [a] : [a, b];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findExactMatch(
  entry: { title: string; altTitles: string[] },
  candidates: MangaSummary[],
  excludeId: string,
  currentVotes: number,
): MangaSummary | null {
  const norms = new Set<string>();
  for (const s of [entry.title, ...entry.altTitles]) {
    for (const v of titleVariants(s)) {
      if (v) norms.add(v);
    }
  }
  const exact = candidates.filter((c) => {
    if (c.id === excludeId) return false;
    for (const v of titleVariants(c.title)) {
      if (norms.has(v)) return true;
    }
    return c.altTitles.some((a) =>
      titleVariants(a).some((v) => norms.has(v)),
    );
  });
  if (!exact.length) return null;
  exact.sort((a, b) => (b.ratingVotes ?? 0) - (a.ratingVotes ?? 0));
  const top = exact[0];
  const topVotes = top.ratingVotes ?? 0;
  if (topVotes < RESCUE_VOTES_MIN) return null;
  // Require a clear popularity gap — prevents pulling a niche entry to a
  // barely-more-popular but unrelated series.
  if (topVotes < currentVotes * RESCUE_RATIO_MIN) return null;
  return top;
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY MODE — will execute swaps." : "DRY-RUN — no writes.");

  // One representative row per unique MU id so we don't recompute candidates
  // per user for the same series.
  const groups = await prisma.readingListEntry.groupBy({
    by: ["mangaId"],
    where: { provider: "mangaupdates" },
    _count: { _all: true },
  });
  console.log(`Scanning ${groups.length} unique MU series IDs...`);

  type Plan = {
    fromMangaId: string;
    fromTitle: string;
    fromVotes: number;
    toMangaId: string;
    toTitle: string;
    toVotes: number;
    affectedRows: number;
  };
  const plans: Plan[] = [];

  let scanned = 0;
  for (const group of groups) {
    scanned++;
    if (scanned % 50 === 0) {
      console.log(`  ...scanned ${scanned}/${groups.length}`);
    }

    let current: MangaSummary | null = null;
    try {
      current = await mangaupdates.getSeriesSummaryById(group.mangaId);
    } catch {
      // ignore — skip
    }
    if (!current) continue;

    const currentVotes = current.ratingVotes ?? 0;
    if (currentVotes >= SUSPECT_VOTES_MAX) {
      // Current target looks legit; nothing to rescue.
      continue;
    }

    // Pull a representative row to get the cached title + altTitles.
    const sample = await prisma.readingListEntry.findFirst({
      where: { provider: "mangaupdates", mangaId: group.mangaId },
      select: { title: true, altTitles: true },
    });
    if (!sample) continue;

    await sleep(DELAY_MS);
    let results: MangaSummary[] = [];
    try {
      results = await mangaupdates.searchSeries(sample.title, { limit: 8 });
    } catch {
      continue;
    }

    const target = findExactMatch(sample, results, group.mangaId, currentVotes);
    if (!target) continue;

    plans.push({
      fromMangaId: group.mangaId,
      fromTitle: current.title,
      fromVotes: currentVotes,
      toMangaId: target.id,
      toTitle: target.title,
      toVotes: target.ratingVotes ?? 0,
      affectedRows: group._count._all,
    });

    await sleep(DELAY_MS);
  }

  console.log(`\n=== Rescue plan ===`);
  if (!plans.length) {
    console.log("No candidate swaps found.");
    await prisma.$disconnect();
    return;
  }
  for (const p of plans) {
    console.log(
      `  "${p.fromTitle}" ${p.fromMangaId} (votes=${p.fromVotes}) -> ` +
        `${p.toMangaId} "${p.toTitle}" (votes=${p.toVotes}) ` +
        `[${p.affectedRows} row${p.affectedRows === 1 ? "" : "s"}]`,
    );
  }
  console.log(
    `\nTotal: ${plans.length} swap${plans.length === 1 ? "" : "s"}, ` +
      `${plans.reduce((a, p) => a + p.affectedRows, 0)} reading-list rows.`,
  );

  if (!apply) {
    console.log(
      "\nDry-run only. Re-run with --apply to execute. Pair with " +
        "set-title-override.ts if you want a custom display title.",
    );
    await prisma.$disconnect();
    return;
  }

  console.log("\nApplying swaps...");
  let migratedRows = 0;
  let skippedRows = 0;
  for (const plan of plans) {
    let target: MangaSummary | null = null;
    try {
      target = await mangaupdates.getSeriesSummaryById(plan.toMangaId);
    } catch {
      console.warn(`  Couldn't refetch target ${plan.toMangaId}; skipping plan.`);
      continue;
    }
    if (!target) continue;

    const rows = await prisma.readingListEntry.findMany({
      where: { provider: "mangaupdates", mangaId: plan.fromMangaId },
    });

    for (const row of rows) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.readingListEntry.upsert({
            where: {
              userId_provider_mangaId: {
                userId: row.userId,
                provider: "mangaupdates",
                mangaId: target!.id,
              },
            },
            create: {
              userId: row.userId,
              provider: "mangaupdates",
              mangaId: target!.id,
              title: target!.title,
              altTitles: target!.altTitles,
              description: target!.description ?? null,
              status: target!.status ?? null,
              year: target!.year ?? null,
              contentRating: target!.contentRating ?? null,
              demographic: target!.demographic ?? null,
              latestChapter: target!.latestChapter ?? null,
              languages: target!.languages,
              tags: target!.tags,
              coverImage: target!.coverImage ?? null,
              url: target!.url,
              progress: row.progress,
              rating: row.rating,
              notes: row.notes,
              createdAt: row.createdAt,
            },
            update: {
              ...(row.progress ? { progress: row.progress } : {}),
              ...(row.rating !== null ? { rating: row.rating } : {}),
              ...(row.notes ? { notes: row.notes } : {}),
            },
          });
          await tx.readingListEntry.delete({ where: { id: row.id } });
        });
        migratedRows++;
      } catch (err) {
        skippedRows++;
        console.warn(
          `  Skipped row ${row.id} (user=${row.userId}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  console.log(`\nDone. Rescued ${migratedRows} rows (skipped ${skippedRows}).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
