import { NextRequest, NextResponse } from "next/server";

import { MangaDexAPIError, searchManga } from "@/lib/mangadex/service";

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
      : undefined;

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
    const results = await searchManga(query, { limit });

    return NextResponse.json(
      {
        data: results,
        count: results.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
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
