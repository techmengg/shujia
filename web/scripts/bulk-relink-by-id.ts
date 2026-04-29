/**
 * Bulk-relink every reading-list row that points at a specific MangaDex
 * UUID to a specific MangaUpdates id. Use when the auto-migrator's title
 * matchers couldn't bridge a series and you've manually identified the
 * MD <-> MU equivalence.
 *
 * Usage from web/:
 *   pnpm dlx tsx scripts/bulk-relink-by-id.ts <mdMangaId> <muMangaId>
 *
 * Example (Omniscient Reader's Viewpoint):
 *   pnpm dlx tsx scripts/bulk-relink-by-id.ts 9a414441-bbad-43f1-a3a7-dc262ca790a3 50369844984
 *
 * For each MD row, this preserves progress / rating / notes / createdAt
 * and does the upsert+delete in a single transaction, so a user can
 * never end up with both copies. Skips users who already have an MU row
 * for the same series — their existing MU row stays the source of truth.
 *
 * Pair with set-title-override.ts when MU's canonical title isn't the
 * one you want displayed.
 */

import { PrismaClient } from "@prisma/client";

import * as mangaupdates from "../src/lib/mangaupdates/service";

const prisma = new PrismaClient();

async function main() {
  const [mdMangaId, muMangaId] = process.argv.slice(2);
  if (!mdMangaId || !muMangaId) {
    console.error(
      "Usage: pnpm dlx tsx scripts/bulk-relink-by-id.ts <mdMangaId> <muMangaId>",
    );
    process.exit(2);
  }

  const summary = await mangaupdates.getSeriesSummaryById(muMangaId);
  if (!summary) {
    console.error(`Couldn't fetch MangaUpdates series ${muMangaId}.`);
    process.exit(1);
  }
  console.log(`Target: ${summary.title} (MU ${muMangaId})`);

  const entries = await prisma.readingListEntry.findMany({
    where: { provider: "mangadex", mangaId: mdMangaId },
  });
  console.log(`Found ${entries.length} MangaDex entries pointing at ${mdMangaId}.`);

  if (!entries.length) {
    await prisma.$disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  for (const entry of entries) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.readingListEntry.upsert({
          where: {
            userId_provider_mangaId: {
              userId: entry.userId,
              provider: "mangaupdates",
              mangaId: muMangaId,
            },
          },
          create: {
            userId: entry.userId,
            provider: "mangaupdates",
            mangaId: muMangaId,
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
            mangaId: mdMangaId,
          },
        });
      });
      migrated++;
    } catch (err) {
      skipped++;
      console.warn(
        `Skipped user ${entry.userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`\nRelinked ${migrated}/${entries.length} entries (skipped ${skipped}).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
