import { unstable_cache } from "next/cache";

import { getRedditMangaDiscussions } from "@/lib/reddit/manga-discussions";
import type { MangaSummary } from "@/lib/manga/types";
import { getTrending, searchSeries } from "@/lib/mangaupdates/service-cached";

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

function normaliseTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normaliseTitle(input).split(/\s+/).filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Patterns that suggest a candidate is a SIDE PRODUCT (doujin, fanmade,
// novel adaptation when we wanted manga, art book, etc.) — we deprioritize
// these because Reddit `[DISC]` is almost always about the main canonical
// series.
const SIDE_PRODUCT_RE =
  /\b(doujin|doujinshi|fan[- ]?made|fanmade|fanbook|art ?book|guide ?book|side ?story|spin[- ]?off|prequel|sequel ?\d|novel|light ?novel|webnovel|web ?novel|anthology|databook)\b/i;

interface ResolutionCandidate {
  summary: MangaSummary;
  confidence: number; // 0..1
}

function scoreCandidate(
  seedTokens: string[],
  seedNorm: string,
  candidate: MangaSummary,
): ResolutionCandidate {
  const candidateTitleNorm = normaliseTitle(candidate.title);
  const candidateTitleTokens = tokenize(candidate.title);
  const altTokenSets = (candidate.altTitles ?? []).map(tokenize);

  // Best Jaccard overlap with primary title or any alt title.
  let bestOverlap = jaccard(seedTokens, candidateTitleTokens);
  for (const altTokens of altTokenSets) {
    const overlap = jaccard(seedTokens, altTokens);
    if (overlap > bestOverlap) bestOverlap = overlap;
  }

  // Exact match (after normalization) is a hard 1.0.
  const exact =
    candidateTitleNorm === seedNorm ||
    (candidate.altTitles ?? []).some((a) => normaliseTitle(a) === seedNorm);

  let confidence = exact ? 1 : bestOverlap;

  // Bidirectional containment ("TBATE" inside "The Beginning After The End")
  // bumps confidence when overlap is otherwise low — short acronyms tokenize
  // poorly.
  if (
    !exact &&
    confidence < 0.6 &&
    (candidateTitleNorm.includes(seedNorm) || seedNorm.includes(candidateTitleNorm))
  ) {
    confidence = Math.max(confidence, 0.6);
  }

  // Penalty: candidate looks like a side product (doujin, novel, art book)
  if (SIDE_PRODUCT_RE.test(candidate.title)) {
    confidence *= 0.5;
  }
  // Smaller penalty: side product hint in alt titles (still might be the
  // right one if exact-matched there, but slightly lower ranking).
  else if ((candidate.altTitles ?? []).some((a) => SIDE_PRODUCT_RE.test(a))) {
    confidence *= 0.85;
  }

  return { summary: candidate, confidence };
}

const MIN_RESOLUTION_CONFIDENCE = 0.5;

async function resolveTitleToMu(seedTitle: string): Promise<MangaSummary | null> {
  let candidates: MangaSummary[] = [];
  try {
    candidates = await searchSeries(seedTitle, 8);
  } catch {
    return null;
  }
  if (!candidates.length) return null;

  const seedNorm = normaliseTitle(seedTitle);
  const seedTokens = tokenize(seedTitle);

  const scored = candidates
    .map((c) => scoreCandidate(seedTokens, seedNorm, c))
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  if (!best || best.confidence < MIN_RESOLUTION_CONFIDENCE) return null;

  return best.summary;
}

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
