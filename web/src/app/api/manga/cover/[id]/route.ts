import { getSeriesSummaryById } from "@/lib/mangaupdates/service-cached";

/**
 * Sends the browser to a series' current MangaUpdates cover. Reading-list
 * rows keep the cover URL from when they were added, and MangaUpdates
 * retires old image ids when a series gets a new cover, so covers on
 * profiles and rails break over time. Cards fall back to this route when
 * their stored cover fails to load.
 *
 * The redirect target only ever comes from the MangaUpdates API and is
 * checked against its image host, so this never sends anyone elsewhere.
 */
const COVER_HOST = "cdn.mangaupdates.com";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) {
    return new Response(null, { status: 400 });
  }

  const summary = await getSeriesSummaryById(id).catch(() => null);
  const cover = summary?.coverImage;
  let target: URL | null = null;
  if (cover) {
    try {
      const url = new URL(cover);
      if (url.protocol === "https:" && url.hostname === COVER_HOST) target = url;
    } catch {
      target = null;
    }
  }

  if (!target) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      // Edge-cached, so a busy page of stale covers costs one function
      // call per series per day rather than one per view.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
