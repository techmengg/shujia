import { unstable_cache } from "next/cache";

import { getMangaSummaryById, type Provider } from "@/lib/manga";
import { getTitleOverrides } from "@/lib/manga/title-override";
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
  // MU-only: legacy MangaDex rows still exist in ReadingListEntry until the
  // background relinker reaches them, and their UUID `mangaId`s render as
  // broken `/manga/<uuid>` links on shujia (post-migration the detail page
  // is keyed on MU integer IDs). Filtering at the query level is cleaner
  // than dropping items downstream.
  const groups = await prisma.readingListEntry.groupBy({
    by: ["provider", "mangaId"],
    where: { provider: "mangaupdates" },
    _count: { _all: true },
    orderBy: { _count: { provider: "desc" } },
    take: MOST_TRACKED_LIMIT,
  });
  if (!groups.length) return [];

  // One representative entry per group gives us the cached title + cover.
  const entries = await prisma.readingListEntry.findMany({
    where: {
      provider: "mangaupdates",
      OR: groups.map((g) => ({ mangaId: g.mangaId })),
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

  // Apply admin-set title overrides so e.g. MU's "Omniscient Reader" renders
  // here as "Omniscient Reader's Viewpoint", matching the manga detail page.
  const overrides = await getTitleOverrides(
    items.map((i) => ({ provider: i.provider as Provider, mangaId: i.mangaId })),
  );
  if (overrides.size) {
    for (const item of items) {
      const override = overrides.get(`${item.provider}:${item.mangaId}`);
      if (override) item.title = override;
    }
  }

  return items;
}

export const getMostTracked = unstable_cache(
  fetchMostTracked,
  // v3 — bumped to bust the stale cache holding broken /manga/<MD-UUID>
  // links. v2 added the provider="mangaupdates" filter; v3 also applies
  // MangaTitleOverride so e.g. "Omniscient Reader's Viewpoint" shows here.
  ["home-most-tracked-v3"],
  { revalidate: 600, tags: ["home-most-tracked"] },
);
