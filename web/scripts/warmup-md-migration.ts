/**
 * One-shot proactive MangaDex -> MangaUpdates migrator.
 *
 * Run from web/:
 *   pnpm dlx tsx scripts/warmup-md-migration.ts
 *
 * Walks every remaining ReadingListEntry where provider="mangadex" and runs
 * tryMigrateEntryToMangaUpdates against it. Use this right after a deploy
 * to avoid users hitting 404s on /manga/<MD-UUID> for entries the lazy
 * migrator hasn't promoted yet.
 *
 * Throttling: sequential with a small delay between MU API calls to respect
 * the MangaUpdates Acceptable Use Policy (space out requests).
 */

import { PrismaClient } from "@prisma/client";

import { tryMigrateEntryToMangaUpdates } from "../src/lib/manga/migrate";

const DELAY_MS = 350;
const PROGRESS_EVERY = 25;

const prisma = new PrismaClient();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const entries = await prisma.readingListEntry.findMany({
    where: { provider: "mangadex" },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Found ${entries.length} MangaDex entries to attempt migration.`);
  if (!entries.length) {
    await prisma.$disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  const startedAt = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const ok = await tryMigrateEntryToMangaUpdates(entry);
    if (ok) migrated++;
    else skipped++;

    if ((i + 1) % PROGRESS_EVERY === 0 || i === entries.length - 1) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `[${i + 1}/${entries.length}] migrated=${migrated} skipped=${skipped} elapsed=${elapsed}s`,
      );
    }

    if (i < entries.length - 1) await sleep(DELAY_MS);
  }

  console.log("\n=== Warmup complete ===");
  console.log(`migrated: ${migrated}`);
  console.log(`skipped (no confident match): ${skipped}`);
  console.log(
    "Stragglers will remain on provider=\"mangadex\" and continue to render in users' lists from cached row data, but their /manga/<id> detail pages will 404 until manually re-added.",
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
