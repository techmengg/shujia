export const runtime = "edge";

/**
 * Legacy MangaDex cover proxy from the pre-MangaUpdates era. Old client
 * HTML, indexed search results, and shared links still hit this URL.
 * Respond with 410 Gone + immutable year-long cache: edge caches the
 * response so most requests never invoke the function, and search engines
 * deindex 410s aggressively so inbound traffic decays over weeks.
 */
export function GET() {
  return new Response(null, {
    status: 410,
    headers: {
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
