import { unstable_cache } from "next/cache";

import { getMangaSummaryById, type Provider } from "@/lib/manga";
import { prisma } from "@/lib/prisma";

export interface MostTrackedItem {
  provider: string;
  mangaId: string;
  title: string;
  coverImage: string | null;
  readers: number;
}

const MOST_TRACKED_LIMIT = 12;

async function fetchMostTracked(): Promise<MostTrackedItem[]> {
  // Group reading-list entries by series and rank by reader count.
  const groups = await prisma.readingListEntry.groupBy({
    by: ["provider", "mangaId"],
    _count: { _all: true },
    orderBy: { _count: { provider: "desc" } },
    take: MOST_TRACKED_LIMIT,
  });
  if (!groups.length) return [];

  // One representative entry per group gives us the cached title + cover.
  const entries = await prisma.readingListEntry.findMany({
    where: {
      OR: groups.map((g) => ({ provider: g.provider, mangaId: g.mangaId })),
    },
    distinct: ["provider", "mangaId"],
    orderBy: { updatedAt: "desc" },
    select: {
      provider: true,
      mangaId: true,
      title: true,
      coverImage: true,
    },
  });

  const entryByKey = new Map(
    entries.map((e) => [`${e.provider}:${e.mangaId}`, e]),
  );

  const items: MostTrackedItem[] = [];
  for (const group of groups) {
    const key = `${group.provider}:${group.mangaId}`;
    const entry = entryByKey.get(key);
    if (entry) {
      items.push({
        provider: entry.provider,
        mangaId: entry.mangaId,
        title: entry.title,
        coverImage: entry.coverImage ?? null,
        readers: group._count._all,
      });
      continue;
    }
    // Edge case: a group exists but no entry rendered (shouldn't happen unless
    // the entries were deleted between queries). Skip rather than crash.
  }

  // Final pass: any item missing a cover gets a best-effort fetch from MU.
  // Cached upstream so this is cheap on repeat renders.
  await Promise.all(
    items
      .filter((i) => !i.coverImage)
      .map(async (item) => {
        try {
          const summary = await getMangaSummaryById(
            item.mangaId,
            item.provider as Provider,
          );
          if (summary?.coverImage) item.coverImage = summary.coverImage;
        } catch {
          // ignore
        }
      }),
  );

  return items;
}

export const getMostTracked = unstable_cache(fetchMostTracked, ["home-most-tracked"], {
  revalidate: 600,
  tags: ["home-most-tracked"],
});
