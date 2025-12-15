import { NextRequest, NextResponse } from "next/server";
import { getRecentPopularByOriginalLanguage } from "@/lib/manga-service";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const language = url.searchParams.get("language") || "ja";
  const timeframe = (url.searchParams.get("timeframe") as '7d' | '1m' | '3m' | 'mixed') || "mixed";
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  
  // Get content preferences from query params
  const showMatureContent = url.searchParams.get("showMatureContent") === "true";
  const showExplicitContent = url.searchParams.get("showExplicitContent") === "true";
  const showPornographicContent = url.searchParams.get("showPornographicContent") === "true";

  try {
    const data = await getRecentPopularByOriginalLanguage(
      language,
      limit,
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
      timeframe
    );

    return NextResponse.json(
      {
        success: true,
        data,
        count: data.length,
        timeframe,
        language,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5 minutes
        },
      }
    );
  } catch (error) {
    console.error("[API] Trending error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch trending manga",
      },
      {
        status: 500,
      }
    );
  }
}

