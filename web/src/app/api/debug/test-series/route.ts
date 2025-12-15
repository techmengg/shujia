import { NextResponse } from "next/server";
import { getPopularNewTitles, searchManga, getMangaDetails } from "@/lib/manga-service";

export async function GET() {
  try {
    console.log("🧪 Testing unified manga service (via scraper API)...");
    
    // Test 1: Search
    console.log("Test 1: Searching for 'one piece'...");
    const searchResults = await searchManga("one piece", { limit: 3 });
    console.log(`Search returned ${searchResults.length} results`);
    
    // Test 2: Browse popular new titles
    console.log("Test 2: Fetching popular new titles...");
    const browseResults = await getPopularNewTitles(5);
    console.log(`Browse returned ${browseResults.length} results`);
    
    // Test 3: Get details for a specific manga (One Piece)
    console.log("Test 3: Fetching manga details...");
    const details = searchResults.length > 0 
      ? await getMangaDetails(searchResults[0].id)
      : null;
    console.log(`Details: ${details ? 'fetched successfully' : 'not available'}`);
    
    return NextResponse.json({
      ok: true,
      search: {
        count: searchResults.length,
        results: searchResults,
      },
      browse: {
        count: browseResults.length,
        results: browseResults,
      },
      details: details ? {
        title: details.title,
        description: details.description?.substring(0, 100) + "...",
        authors: details.authors,
        genres: details.genres,
      } : null,
    });
  } catch (error) {
    console.error("Debug test failed:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

