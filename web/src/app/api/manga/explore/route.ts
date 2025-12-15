import { NextResponse } from "next/server";
import { exploreManga } from "@/lib/manga-service";
import { getUserAdultContentPreferences } from "@/lib/user-preferences";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const orderField = searchParams.get("orderField") || "score";
    
    const types = searchParams.getAll("type[]");
    const genres = searchParams.getAll("genre[]");
    
    // Get user's 3-tier adult content preferences
    const prefs = await getUserAdultContentPreferences();

    const result = await exploreManga({
      limit,
      offset,
      types: types.length > 0 ? types : undefined,
      genres: genres.length > 0 ? genres : undefined,
      orderby: orderField === "followedCount" || orderField === "rating" ? "score" : 
               orderField === "updatedAt" ? "score" :
               orderField,
      showMatureContent: prefs.showMatureContent,
      showExplicitContent: prefs.showExplicitContent,
      showPornographicContent: prefs.showPornographicContent,
    });

    return NextResponse.json({
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5 minutes
      },
    });
  } catch (error) {
    console.error("Explore API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manga" },
      { status: 500 },
    );
  }
}

