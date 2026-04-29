import { unstable_cache } from "next/cache";

import { resolveTitleToMu } from "@/lib/manga/title-resolver";
import type { MangaSummary } from "@/lib/manga/types";
import { getMangaBakaNewReleases } from "@/lib/mangabaka/client";
import { withStaleWhileRevalidate } from "@/lib/utils/swr-cache";

/**
 * Home "New releases" rail. MangaBaka exposes the publication-date filter
 * we need (`published_start_date_lower`) and a `published_start_date_desc`
 * sort that mirrors their own "New releases" page. We then resolve each
 * entry to a MangaUpdates ID so the cards click through to shujia's
 * existing `/manga/<MU-id>` detail pages.
 *
 * The MB client is responsible for filtering out entries that have no
 * English title (Japanese-only placeholders like "Yamenaide, Chayama-kun"),
 * so by the time we get here we're already working from a pool of
 * recognisable, English-titled fresh releases. The MU-resolution step then
 * drops anything not yet on MangaUpdates — better to render fewer real
 * cards than fill the rail with broken links.
 */
const TARGET_LIMIT = 12;

async function fetchNewReleases(): Promise<MangaSummary[]> {
  const baka = await getMangaBakaNewReleases().catch(() => []);
  if (!baka.length) return [];

  // Resolve each MB title to a MU summary in parallel. searchSeries is
  // cached at the MU client layer so a cache miss does N parallel network
  // calls and subsequent windows are free. Lower confidence threshold
  // (0.35) because brand-new series often have less-canonical titles on
  // MU and exact-match is rare.
  const resolved = await Promise.all(
    baka.map((s) =>
      resolveTitleToMu(s.title, {
        altTitles: s.altTitles,
        minConfidence: 0.35,
      }),
    ),
  );

  const seen = new Set<string>();
  const out: MangaSummary[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const summary = resolved[i];
    if (!summary?.id || seen.has(summary.id)) continue;
    // Carry the MangaBaka cover through — it's higher-quality than MU's
    // and was the entry point for ranking. Falls back to MU's cover if MB
    // didn't have one for this entry.
    const mbCover = baka[i]?.coverUrl;
    seen.add(summary.id);
    out.push(mbCover ? { ...summary, coverImage: mbCover } : summary);
    if (out.length >= TARGET_LIMIT) break;
  }
  return out;
}

const cachedNewReleases = unstable_cache(
  fetchNewReleases,
  // v6 — bumped alongside the MB client v6 (English-title filter + wider
  // candidate pool). Cards now link to `/manga/<MU-id>` again, drawing
  // titles from MB's English secondary_titles.
  ["home-new-releases-v6"],
  { revalidate: 86400 * 7, tags: ["home-new-releases"] },
);

export const getNewReleases = withStaleWhileRevalidate({
  cached: cachedNewReleases,
  tag: "home-new-releases",
  refreshIntervalMs: 30 * 60 * 1000,
});
