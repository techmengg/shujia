/**
 * Last-resort migrator for MD stragglers — entries the strict / loose /
 * alt-titles passes couldn't bridge because the canonical MU title is
 * a *different romanization* (e.g., MD "Goodnight Punpun" vs MU
 * "Oyasumi Punpun", Levenshtein distance ~10).
 *
 * Strategy: trust MU's search ranking, but ONLY when the top result is
 * overwhelmingly dominant by votes (>= TOP_VOTES_MIN absolute AND
 * >= TOP_VOTES_RATIO * next result). Skip entries whose title contains
 * intentional-variant markers — "(Doujinshi)", "(Special)",
 * "(Pre-serialization)", "dj -" — since those are user-deliberate.
 *
 * Defaults to dry-run. Pass --apply to execute.
 *
 * Usage from web/:
 *   pnpm dlx tsx scripts/rescue-md-stragglers.ts            # dry-run
 *   pnpm dlx tsx scripts/rescue-md-stragglers.ts --apply    # execute
 */

import { PrismaClient } from "@prisma/client";

import * as mangaupdates from "../src/lib/mangaupdates/service";
import type { MangaSummary } from "../src/lib/manga/types";

const TOP_VOTES_MIN = 200;
const TOP_VOTES_RATIO = 5; // top must beat next by this multiplier
const DELAY_MS = 350;

// Markers that signal the user deliberately picked a variant. Skip these
// rows — we don't want to silently swap a tracked doujinshi to its parent
// series.
const SKIP_MARKERS = [
  /\(doujinshi\)/i,
  /\(special\)/i,
  /\(one[-\s]?shot\)/i,
  /\(pre[-\s]?serialization\)/i,
  /\(side[-\s]?story\)/i,
  /\bdj\s*-/i,
  /\bdj\.\s/i,
  /\(omakes?\)/i,
  /\(novel\)/i,
  /\bgaiden\b/i,
];

// Cosmetic re-coloring / re-edition markers. Stripped from the search
// query so MU returns the canonical series instead of falling back to a
// random popular hit when given a nonsense query.
const STRIP_PATTERNS = [
  /\s*\(official\s+colored\)\s*/gi,
  /\s*\(fan\s+colored\)\s*/gi,
  /\s*\(recolored\)\s*/gi,
  /\s*\(colored\)\s*/gi,
  /\s*\(minimalist\s+color\)\s*/gi,
  /\s*\(shinsoban\s+release\)\s*/gi,
  /\s*\(volume\s+release\)\s*/gi,
  /\s*\(anniversary\s+edition\)\s*/gi,
];

function stripCosmeticMarkers(title: string): string {
  let cleaned = title;
  for (const re of STRIP_PATTERNS) cleaned = cleaned.replace(re, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

function shareDistinctiveToken(query: string, candidate: { title: string; altTitles: string[] }): boolean {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return false;
  const cTokens = new Set([
    ...tokenize(candidate.title),
    ...candidate.altTitles.flatMap(tokenize),
  ]);
  for (const t of qTokens) {
    if (cTokens.has(t)) return true;
  }
  return false;
}

const prisma = new PrismaClient();

function shouldSkip(title: string): boolean {
  return SKIP_MARKERS.some((re) => re.test(title));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const excludeArg = process.argv.find((a) => a.startsWith("--exclude="));
  const excludeTitles = excludeArg
    ? excludeArg
        .slice("--exclude=".length)
        .split("|")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  if (excludeTitles.length) {
    console.log(`Excluding ${excludeTitles.length} titles by substring match.`);
  }
  console.log(apply ? "APPLY MODE — will execute swaps." : "DRY-RUN — no writes.");

  // Group MD stragglers by mangaId so we propose once per UUID even if
  // multiple users hold it.
  const groups = await prisma.readingListEntry.groupBy({
    by: ["mangaId"],
    where: { provider: "mangadex" },
    _count: { _all: true },
  });
  console.log(`Scanning ${groups.length} unique MD stragglers...`);

  type Plan = {
    mdMangaId: string;
    mdTitle: string;
    targetId: string;
    targetTitle: string;
    targetVotes: number;
    nextVotes: number;
    affectedRows: number;
  };
  const plans: Plan[] = [];
  const skips: { mdTitle: string; reason: string }[] = [];

  let scanned = 0;
  for (const group of groups) {
    scanned++;
    if (scanned % 50 === 0) {
      console.log(`  ...scanned ${scanned}/${groups.length}`);
    }

    const sample = await prisma.readingListEntry.findFirst({
      where: { provider: "mangadex", mangaId: group.mangaId },
      select: { title: true, altTitles: true },
    });
    if (!sample) continue;

    if (shouldSkip(sample.title)) {
      skips.push({ mdTitle: sample.title, reason: "intentional-variant marker" });
      continue;
    }

    const titleLower = sample.title.toLowerCase();
    if (excludeTitles.some((ex) => titleLower.includes(ex))) {
      skips.push({ mdTitle: sample.title, reason: "user-excluded" });
      continue;
    }

    const cleanedQuery = stripCosmeticMarkers(sample.title);

    let results: MangaSummary[] = [];
    try {
      results = await mangaupdates.searchSeries(cleanedQuery, { limit: 5 });
    } catch {
      // ignore
    }
    await sleep(DELAY_MS);

    if (results.length === 0) {
      skips.push({ mdTitle: sample.title, reason: "no MU results" });
      continue;
    }

    // Sort search results by votes desc.
    const sorted = [...results].sort(
      (a, b) => (b.ratingVotes ?? 0) - (a.ratingVotes ?? 0),
    );
    const top = sorted[0];
    const next = sorted[1];
    const topVotes = top.ratingVotes ?? 0;
    const nextVotes = next?.ratingVotes ?? 0;

    if (topVotes < TOP_VOTES_MIN) {
      skips.push({
        mdTitle: sample.title,
        reason: `top votes ${topVotes} < ${TOP_VOTES_MIN}`,
      });
      continue;
    }
    if (nextVotes > 0 && topVotes < nextVotes * TOP_VOTES_RATIO) {
      skips.push({
        mdTitle: sample.title,
        reason: `not dominant (top=${topVotes}, next=${nextVotes})`,
      });
      continue;
    }
    // Defense-in-depth: refuse to swap when the proposed candidate shares
    // ZERO 4+-char tokens with the query. Catches "Tokyo Revengers" ->
    // "Vagabond"-style fallbacks where MU defaults to a popular series.
    // Note: some legitimate cross-romanization migrations (e.g. "20th
    // Century Boys" -> "20 Seiki Shounen") have no token overlap and will
    // be skipped here; user can relink those via the UI.
    if (!shareDistinctiveToken(cleanedQuery, top)) {
      skips.push({
        mdTitle: sample.title,
        reason: `no shared 4+char token with "${top.title}"`,
      });
      continue;
    }

    plans.push({
      mdMangaId: group.mangaId,
      mdTitle: sample.title,
      targetId: top.id,
      targetTitle: top.title,
      targetVotes: topVotes,
      nextVotes,
      affectedRows: group._count._all,
    });
  }

  console.log(`\n=== Rescue plan (${plans.length} swaps) ===`);
  for (const p of plans) {
    console.log(
      `  "${p.mdTitle}" -> ${p.targetId} "${p.targetTitle}" ` +
        `(top=${p.targetVotes} next=${p.nextVotes}) [${p.affectedRows} row${p.affectedRows === 1 ? "" : "s"}]`,
    );
  }
  console.log(`\nSkipped ${skips.length} entries.`);
  if (skips.length && !apply) {
    console.log("Skip reasons summary:");
    const reasons = new Map<string, number>();
    for (const s of skips) {
      reasons.set(s.reason.split("(")[0].trim(), (reasons.get(s.reason.split("(")[0].trim()) ?? 0) + 1);
    }
    for (const [r, c] of reasons) console.log(`  ${r}: ${c}`);
  }
  if (!plans.length) {
    await prisma.$disconnect();
    return;
  }
  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to execute.");
    await prisma.$disconnect();
    return;
  }

  console.log("\nApplying...");
  let migratedRows = 0;
  let skippedRows = 0;
  for (const plan of plans) {
    const summary = await mangaupdates.getSeriesSummaryById(plan.targetId);
    if (!summary) {
      console.warn(`  Couldn't refetch ${plan.targetId}; skipping plan.`);
      continue;
    }
    const rows = await prisma.readingListEntry.findMany({
      where: { provider: "mangadex", mangaId: plan.mdMangaId },
    });

    for (const row of rows) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.readingListEntry.upsert({
            where: {
              userId_provider_mangaId: {
                userId: row.userId,
                provider: "mangaupdates",
                mangaId: summary.id,
              },
            },
            create: {
              userId: row.userId,
              provider: "mangaupdates",
              mangaId: summary.id,
              title: summary.title,
              altTitles: summary.altTitles,
              description: summary.description ?? null,
              status: summary.status ?? null,
              year: summary.year ?? null,
              contentRating: summary.contentRating ?? null,
              demographic: summary.demographic ?? null,
              latestChapter: summary.latestChapter ?? null,
              languages: summary.languages,
              tags: summary.tags,
              coverImage: summary.coverImage ?? null,
              url: summary.url,
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
          `  Skipped row ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  console.log(`\nDone. Migrated ${migratedRows} rows (skipped ${skippedRows}).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
