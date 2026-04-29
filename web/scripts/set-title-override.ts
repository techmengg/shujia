/**
 * Set or update a per-manga display-title override.
 *
 * Usage from web/:
 *   pnpm dlx tsx scripts/set-title-override.ts <provider> <mangaId> "<new title>"
 *
 * Example:
 *   pnpm dlx tsx scripts/set-title-override.ts mangaupdates 50369844984 "Omniscient Reader's Viewpoint"
 *
 * Effects:
 *   1. Upserts a row into MangaTitleOverride keyed by (provider, mangaId).
 *   2. Updates the cached `title` on every existing ReadingListEntry that
 *      points at this (provider, mangaId), so users see the new title
 *      immediately on next read instead of waiting for the page-level
 *      override to apply on top of stale cached titles.
 *
 * The override is read at the manga detail page and reading-list
 * serializer (web/src/lib/manga/title-override.ts), so all other surfaces
 * that pull fresh from MU will still show MU's canonical title until they
 * route through that helper.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [providerArg, mangaIdArg, ...titleParts] = process.argv.slice(2);
  const provider = providerArg?.trim();
  const mangaId = mangaIdArg?.trim();
  const title = titleParts.join(" ").trim();

  if (!provider || !mangaId || !title) {
    console.error(
      "Usage: pnpm dlx tsx scripts/set-title-override.ts <provider> <mangaId> \"<new title>\"",
    );
    process.exit(2);
  }

  if (provider !== "mangadex" && provider !== "mangaupdates") {
    console.error(`Unknown provider "${provider}" — must be "mangadex" or "mangaupdates".`);
    process.exit(2);
  }

  const override = await prisma.mangaTitleOverride.upsert({
    where: { provider_mangaId: { provider, mangaId } },
    create: { provider, mangaId, title },
    update: { title },
  });
  console.log(
    `Override saved: ${provider} ${mangaId} -> "${override.title}" (${override.id})`,
  );

  const patched = await prisma.readingListEntry.updateMany({
    where: { provider, mangaId },
    data: { title },
  });
  console.log(`Patched ${patched.count} existing reading-list rows.`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
