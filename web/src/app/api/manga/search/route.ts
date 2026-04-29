import { NextRequest, NextResponse } from "next/server";

import { searchManga } from "@/lib/manga";
import {
  rankSearchHits,
  type ShujiaSignals,
} from "@/lib/manga/search-rank";
import { prisma } from "@/lib/prisma";

// Pull a wider candidate pool from MU than we return — the re-ranker
// reorders within this pool, so a popular series sitting at MU position
// 25 can climb to slot 1 if the other signals support it.
const CANDIDATE_OVERFETCH = 30;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const limit =
    parsedLimit !== undefined &&
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0
      ? parsedLimit
      : 10;

  if (!query || query.trim().length < 1) {
    return NextResponse.json(
      {
        data: [],
        message: "Enter a search query.",
      },
      {
        status: 200,
      },
    );
  }

  try {
    const candidates = await searchManga(query, {
      limit: Math.max(limit, CANDIDATE_OVERFETCH),
    });

    if (!candidates.length) {
      return NextResponse.json(
        { data: [], count: 0 },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
          },
        },
      );
    }

    // Batch-fetch shujia signals for the candidate IDs. Two grouped
    // queries on indexed columns — cheap, but only worth doing for the
    // mangaupdates provider since the rest of the catalog is gone.
    const muIds = candidates
      .filter((m) => m.provider === "mangaupdates")
      .map((m) => m.id);

    const [readingGroups, reviewGroups] =
      muIds.length > 0
        ? await Promise.all([
            prisma.readingListEntry.groupBy({
              by: ["mangaId"],
              where: { provider: "mangaupdates", mangaId: { in: muIds } },
              _count: { _all: true },
            }),
            prisma.review.groupBy({
              by: ["mangaId"],
              where: {
                provider: "mangaupdates",
                mangaId: { in: muIds },
                body: { not: null },
              },
              _count: { _all: true },
              _avg: { rating: true },
            }),
          ])
        : [[], []];

    const readersByMangaId = new Map<string, number>();
    for (const g of readingGroups) {
      readersByMangaId.set(g.mangaId, g._count._all);
    }
    const reviewByMangaId = new Map<
      string,
      { count: number; avg: number | null }
    >();
    for (const g of reviewGroups) {
      reviewByMangaId.set(g.mangaId, {
        count: g._count._all,
        avg: g._avg.rating,
      });
    }

    const hits = candidates.map((manga) => {
      const reading = readersByMangaId.get(manga.id) ?? 0;
      const review = reviewByMangaId.get(manga.id);
      const shujia: ShujiaSignals = {
        readers: reading,
        reviews: review?.count ?? 0,
        avgRating: review?.avg ?? null,
      };
      return { manga, shujia };
    });

    const ranked = rankSearchHits(hits, query).slice(0, limit);

    return NextResponse.json(
      {
        data: ranked,
        count: ranked.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("searchManga dispatch failed", error);
    return NextResponse.json(
      { error: "Unexpected error while searching." },
      { status: 500 },
    );
  }
}
