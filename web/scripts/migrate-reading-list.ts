/**
 * Migration script to convert MangaDex IDs to MangaUpdates IDs in reading list
 * 
 * This script:
 * 1. Finds all reading list entries with MangaDex UUID format IDs
 * 2. Attempts to resolve them to MangaUpdates IDs by title search
 * 3. Updates the entries with new IDs
 * 
 * Run with: npx tsx scripts/migrate-reading-list.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Check if an ID is a MangaDex UUID
function isMangaDexUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Search MangaUpdates for a title
async function searchMangaUpdates(title: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.mangaupdates.com/v1/series/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        search: title,
        stype: "title",
        perpage: 1,
        page: 1,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return String(data.results[0].record.series_id);
    }

    return null;
  } catch (error) {
    console.error(`Error searching for "${title}":`, error);
    return null;
  }
}

async function migrateReadingList() {
  console.log("🔍 Finding reading list entries with MangaDex IDs...\n");

  const entries = await prisma.readingListEntry.findMany({
    select: {
      id: true,
      userId: true,
      mangaId: true,
      title: true,
      coverImage: true,
      url: true,
    },
  });

  const mangaDexEntries = entries.filter((entry) => isMangaDexUUID(entry.mangaId));

  console.log(`Found ${mangaDexEntries.length} entries with MangaDex IDs out of ${entries.length} total entries.\n`);

  if (mangaDexEntries.length === 0) {
    console.log("✅ No migration needed!");
    return;
  }

  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < mangaDexEntries.length; i++) {
    const entry = mangaDexEntries[i];
    console.log(`[${i + 1}/${mangaDexEntries.length}] Processing: ${entry.title}`);

    if (!entry.title) {
      console.log(`  ⚠️  Skipping - no title available`);
      skipped++;
      continue;
    }

    // Try to find on MangaUpdates
    const newId = await searchMangaUpdates(entry.title);

    if (newId) {
      try {
        // Update the entry
        await prisma.readingListEntry.update({
          where: { id: entry.id },
          data: {
            mangaId: newId,
            url: `https://www.mangaupdates.com/series/${newId}`,
          },
        });
        console.log(`  ✅ Migrated to MangaUpdates ID: ${newId}`);
        migrated++;
      } catch (error) {
        console.error(`  ❌ Failed to update database:`, error);
        failed++;
      }
    } else {
      console.log(`  ❌ Could not find on MangaUpdates`);
      failed++;
    }

    // Rate limit: wait 500ms between requests
    if (i < mangaDexEntries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Summary:");
  console.log(`   ✅ Successfully migrated: ${migrated}`);
  console.log(`   ❌ Failed to migrate: ${failed}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log("=".repeat(50) + "\n");

  if (failed > 0) {
    console.log("⚠️  Some entries could not be migrated.");
    console.log("   Consider manually removing them or using title search to re-add them.");
  }
}

async function main() {
  console.log("🚀 Starting Reading List Migration\n");
  console.log("This will convert MangaDex IDs to MangaUpdates IDs.\n");

  try {
    await migrateReadingList();
    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

