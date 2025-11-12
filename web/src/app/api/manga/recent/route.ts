export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import {
  MangaDexAPIError,
  getRecentlyUpdatedManga,
} from "@/lib/mangadex/service";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const parsedOffset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined;

  const limit =
    parsedLimit !== undefined &&
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0 &&
    parsedLimit <= 100
      ? parsedLimit
      : 20;

  const offset =
    parsedOffset !== undefined && Number.isInteger(parsedOffset) && parsedOffset >= 0
      ? parsedOffset
      : 0;

  try {
    const results = await getRecentlyUpdatedManga(limit, offset);

    return NextResponse.json(
      {
        data: results,
        count: results.length,
        limit,
        offset,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    if (error instanceof MangaDexAPIError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while reaching MangaDex.",
      },
      {
        status: 500,
      },
    );
  }
}

