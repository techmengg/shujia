/**
 * Second-pass MD->MU migrator using the loose matcher.
 *
 * Run from web/:
 *   pnpm dlx tsx scripts/warmup-md-migration-loose.ts
 *
 * Use only AFTER the strict warmup-md-migration.ts has run. Targets entries
 * the strict matcher rejected (multi-candidate, one-sided year mismatch,
 * minor title differences). False-positive risk is low — distance <= 3
 * catches romanization/punctuation but not different sequels.
 */

import { PrismaClient } from "@prisma/client";

import { tryMigrateEntryLoose } from "../src/lib/manga/migrate";

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

  console.log(`Found ${entries.length} MangaDex entries to attempt loose migration.`);
  if (!entries.length) {
    await prisma.$disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  const startedAt = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const ok = await tryMigrateEntryLoose(entry);
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

  console.log("\n=== Loose warmup complete ===");
  console.log(`migrated: ${migrated}`);
  console.log(`skipped (still no match): ${skipped}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
