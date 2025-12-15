import { NextRequest, NextResponse } from "next/server";

import { searchManga } from "@/lib/shujiaApi";
import { scraperSearchResultToSummary } from "@/lib/adapters/scraper-to-mangaupdates";
import { getUserAdultContentPreferences } from "@/lib/user-preferences";

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
    // Get user's 3-tier adult content preferences
    const prefs = await getUserAdultContentPreferences();
    
    // Call scraper API instead of MangaUpdates directly
    const scraperResults = await searchManga(query, {
      providers: ["mangaupdates"],
      limit,
      showMatureContent: prefs.showMatureContent,
      showExplicitContent: prefs.showExplicitContent,
      showPornographicContent: prefs.showPornographicContent,
    });

    // Convert scraper API results to MangaSummary format
    const results = scraperResults.map(scraperSearchResultToSummary);

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
    console.error("[API] Search error:", error);

    return NextResponse.json(
      {
        error: "Unexpected error while searching manga.",
      },
      {
        status: 500,
      },
    );
  }
}
