import { unstable_cache } from "next/cache";

import { resolveTitleToMu } from "@/lib/manga/title-resolver";
import { getRedditMangaDiscussions } from "@/lib/reddit/manga-discussions";
import type { MangaSummary } from "@/lib/manga/types";
import { getTrending } from "@/lib/mangaupdates/service-cached";

/**
 * Home-page Trending source. Pulls the top weekly chapter-discussion
 * threads from r/manga (real engagement signal — Reddit users actively
 * upvote threads about chapters they're reading) and resolves each
 * series title back to a MangaUpdates ID so click-through lands on
 * shujia's existing /manga/<MU-id> detail page.
 *
 * This is a *transitional* source — designed to be retired once
 * shujia's own MangaPageView table has 4-6 weeks of accumulated views
 * and we can power "Hot on shujia" from internal data.
 *
 * Falls back to MU `week_pos` (less accurate, see comments in
 * getTrending) if Reddit is unreachable or zero titles resolve.
 */
const TRENDING_LIMIT = 20;
// Drop obscure series with no real community signal on MU. Series under
// this threshold are usually new/niche/mistranslated entries that survived
// the title-resolution step but probably aren't what the user expects to
// see in a "Trending" rail.
const MIN_RATING_VOTES = 50;

async function fetchDiscussionTrending(): Promise<MangaSummary[]> {
  let discussions: Awaited<ReturnType<typeof getRedditMangaDiscussions>> = [];
  try {
    discussions = await getRedditMangaDiscussions();
  } catch {
    discussions = [];
  }

  if (!discussions.length) {
    try {
      return await getTrending(TRENDING_LIMIT);
    } catch {
      return [];
    }
  }

  // Resolve each Reddit-extracted title to a MU summary. searchSeries
  // is cached at the MU client layer so resolution is cheap on repeat.
  // Pulling 4x the final limit because the vote-gate (≥50 MU votes) +
  // confidence threshold both drop a meaningful fraction of candidates.
  const resolved = await Promise.all(
    discussions
      .slice(0, TRENDING_LIMIT * 4)
      .map((d) => resolveTitleToMu(d.title)),
  );

  // Dedupe by MU id and gate on a minimum vote count so obscure entries
  // that survived title resolution don't pollute the rail.
  const seen = new Set<string>();
  const out: MangaSummary[] = [];
  for (const summary of resolved) {
    if (!summary?.id || seen.has(summary.id)) continue;
    if (
      typeof summary.ratingVotes !== "number" ||
      summary.ratingVotes < MIN_RATING_VOTES
    )
      continue;
    seen.add(summary.id);
    out.push(summary);
    if (out.length >= TRENDING_LIMIT) break;
  }

  if (!out.length) {
    try {
      return await getTrending(TRENDING_LIMIT);
    } catch {
      return [];
    }
  }

  return out;
}

export const getReaderTrending = unstable_cache(
  fetchDiscussionTrending,
  // v6 — bumped after widening the upstream candidate pool (Reddit 80
  // posts × MU resolution 4×limit) so the home rail consistently lands
  // its 20-item target after filter attrition.
  ["home-discussion-trending-v6"],
  { revalidate: 3600, tags: ["home-discussion-trending"] },
);
