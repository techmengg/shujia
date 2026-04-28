/**
 * Reading-list provider migration stats.
 *
 * Run from web/:
 *   pnpm dlx tsx scripts/migration-stats.ts
 *
 * Prints:
 *   - Total entries per provider
 *   - Per-user breakdown (top 10 by MD entry count) if any stragglers remain
 *   - Simple diagnostic: if MD stragglers > 20% of total, suggest loosening matcher
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const byProvider = await prisma.readingListEntry.groupBy({
    by: ["provider"],
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    byProvider.map((row) => [row.provider, row._count._all]),
  );

  const md = counts.mangadex ?? 0;
  const mu = counts.mangaupdates ?? 0;
  const total = md + mu;

  console.log("\n=== Reading list provider breakdown ===");
  console.table(byProvider.map((row) => ({
    provider: row.provider,
    count: row._count._all,
  })));

  if (total === 0) {
    console.log("No reading list entries yet.");
    await prisma.$disconnect();
    return;
  }

  const mdPct = (md / total) * 100;
  const muPct = (mu / total) * 100;

  console.log(`\nmangadex:     ${md} (${mdPct.toFixed(1)}%)`);
  console.log(`mangaupdates: ${mu} (${muPct.toFixed(1)}%)`);

  if (md > 0) {
    const topMdUsers = await prisma.readingListEntry.groupBy({
      by: ["userId"],
      where: { provider: "mangadex" },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    console.log("\n=== Top 10 users still holding MangaDex entries ===");
    console.table(topMdUsers.map((row) => ({
      userId: row.userId,
      mdCount: row._count._all,
    })));
  }

  console.log("\n=== Diagnostic ===");
  if (md === 0) {
    console.log("✅ All entries migrated to MangaUpdates.");
  } else if (mdPct > 20) {
    console.log(
      `⚠ ${mdPct.toFixed(1)}% of entries still on MangaDex. Consider loosening the migrator match criteria in src/lib/manga/migrate.ts (e.g., pick highest-rated MU match when multiple candidates share the normalized title).`,
    );
  } else {
    console.log(
      `${mdPct.toFixed(1)}% of entries still on MangaDex — within the acceptable straggler range (<20%).`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
