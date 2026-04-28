export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { getRecentReleases } from "@/lib/mangaupdates/service-cached";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const limit =
    parsedLimit !== undefined &&
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0 &&
    parsedLimit <= 50
      ? parsedLimit
      : 20;

  try {
    const results = await getRecentReleases(limit);

    return NextResponse.json(
      {
        data: results,
        count: results.length,
        limit,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Recent releases error:", error);
    return NextResponse.json(
      { error: "Unable to load recent releases." },
      { status: 500 },
    );
  }
}
