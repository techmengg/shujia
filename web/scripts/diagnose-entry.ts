/**
 * Diagnose a specific reading-list entry: what's cached on the row, what
 * MU currently says about that series, and what MU search returns for
 * the cached title (to see whether a better candidate exists).
 *
 * Usage from web/:
 *   pnpm dlx tsx scripts/diagnose-entry.ts <username> "<title-substring>"
 *
 * Example:
 *   pnpm dlx tsx scripts/diagnose-entry.ts techmeng "Look Back"
 */

import { PrismaClient } from "@prisma/client";

import * as mangaupdates from "../src/lib/mangaupdates/service";

const prisma = new PrismaClient();

async function main() {
  const [usernameArg, ...titleParts] = process.argv.slice(2);
  const usernameRaw = usernameArg?.trim().replace(/^@/, "").toLowerCase();
  const titleSubstring = titleParts.join(" ").trim();
  if (!usernameRaw || !titleSubstring) {
    console.error('Usage: pnpm dlx tsx scripts/diagnose-entry.ts <username|*> "<title-substring>"');
    process.exit(2);
  }

  const where =
    usernameRaw === "*"
      ? { title: { contains: titleSubstring, mode: "insensitive" as const } }
      : await (async () => {
          const user = await prisma.user.findUnique({ where: { username: usernameRaw } });
          if (!user) {
            console.error(`User @${usernameRaw} not found.`);
            process.exit(1);
          }
          return {
            userId: user.id,
            title: { contains: titleSubstring, mode: "insensitive" as const },
          };
        })();

  const matches = await prisma.readingListEntry.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  if (!matches.length) {
    console.log(`No reading-list rows for @${usernameRaw} matching "${titleSubstring}".`);
    await prisma.$disconnect();
    return;
  }

  for (const entry of matches) {
    console.log("\n=== Reading-list row ===");
    console.log(`id:        ${entry.id}`);
    console.log(`provider:  ${entry.provider}`);
    console.log(`mangaId:   ${entry.mangaId}`);
    console.log(`title:     ${entry.title}`);
    console.log(`altTitles: ${JSON.stringify(entry.altTitles)}`);
    console.log(`createdAt: ${entry.createdAt.toISOString()}`);

    if (entry.provider !== "mangaupdates") {
      console.log("(MD straggler — no current MU target; searching MU by title for proposals)");
    }

    if (entry.provider === "mangaupdates") {
      let summary = null;
      try {
        summary = await mangaupdates.getSeriesSummaryById(entry.mangaId);
      } catch (err) {
        console.log(`MU fetch error: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (summary) {
        console.log("\n  Current MU target:");
        console.log(`    title:        ${summary.title}`);
        console.log(`    altTitles:    ${JSON.stringify(summary.altTitles).slice(0, 200)}`);
        console.log(`    year:         ${summary.year}`);
        console.log(`    ratingVotes:  ${summary.ratingVotes ?? 0}`);
        console.log(`    url:          ${summary.url}`);
      }
    }

    let results: Awaited<ReturnType<typeof mangaupdates.searchSeries>> = [];
    try {
      results = await mangaupdates.searchSeries(entry.title, { limit: 8 });
    } catch (err) {
      console.log(`MU search error: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log(`\n  MU search results for "${entry.title}":`);
    if (!results.length) console.log("    (no results)");
    for (const r of results) {
      const flag = r.id === entry.mangaId ? "  <- current" : "";
      console.log(
        `    ${r.id.padEnd(14)} votes=${(r.ratingVotes ?? 0).toString().padStart(5)} year=${(r.year ?? "?").toString().padStart(4)}  "${r.title}"${flag}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
