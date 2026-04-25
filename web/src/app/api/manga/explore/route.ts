import { NextResponse } from "next/server";
import { searchSeries } from "@/lib/mangaupdates/service";
import type { MangaUpdatesSearchOrderBy, MangaUpdatesSeriesType } from "@/lib/mangaupdates/types";

const VALID_ORDER: Set<string> = new Set<MangaUpdatesSearchOrderBy>([
  "score", "title", "rating", "year", "date_added",
  "week_pos", "month1_pos", "month3_pos", "month6_pos", "year_pos",
]);

const VALID_TYPES: Set<string> = new Set<MangaUpdatesSeriesType>([
  "Manga", "Manhwa", "Manhua", "OEL",
]);

const ADULT_EXCLUDE = [
  "Adult", "Hentai", "Mature", "Smut", "Ecchi", "Yaoi", "Yuri",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const perpage = Math.min(Number(searchParams.get("perpage")) || 30, 50);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const orderby = searchParams.get("orderby") || "rating";
    const types = searchParams.getAll("type[]").filter((t) => VALID_TYPES.has(t));
    const genres = searchParams.getAll("genre[]");
    const year = searchParams.get("year") || undefined;
    const validOrder = VALID_ORDER.has(orderby)
      ? (orderby as MangaUpdatesSearchOrderBy)
      : "rating";

    const results = await searchSeries("", {
      limit: perpage,
      page,
      orderby: validOrder,
      type: types.length ? (types as MangaUpdatesSeriesType[]) : undefined,
      genre: genres.length ? genres : undefined,
      excludeGenre: ADULT_EXCLUDE,
      year,
    });

    return NextResponse.json({
      data: results,
      page,
      perpage,
      hasMore: results.length >= perpage,
    });
  } catch (error) {
    console.error("Explore API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manga" },
      { status: 500 },
    );
  }
}
