/**
 * Search relevance ranker.
 *
 * MU's `/series/search` returns results in a text-match order that's good
 * for exact-title queries ("berserk" → Berserk first) but doesn't account
 * for series quality or shujia community signal. For ambiguous queries
 * ("tower", "knight", "regression") we want well-known popular series
 * surfaced ahead of obscure entries.
 *
 * Strategy: take MU's top-N candidates (typically 30), blend three
 * signals into a relevance score, sort, return the top K.
 *
 *   1. **Title exactness** — exact / prefix / substring match against
 *      title or alt-titles. Dominates everything else, so a precise
 *      title query never gets bumped off top by a more popular series
 *      with the query word in its title.
 *
 *   2. **MU quality** — `bayesianRating × log(1 + ratingVotes)`. Rewards
 *      both rating AND vote-count; a 9.0 with 50 votes loses to a 9.0
 *      with 5000 votes, but also loses to an 8.5 with 50000 votes.
 *
 *   3. **Shujia signal** — reader count + review count + avg review
 *      rating × volume. The most-relevant signal for "what shujia users
 *      care about", but only matters once the catalog has accumulated
 *      enough activity per series.
 */
import type { MangaSummary } from "./types";

export interface ShujiaSignals {
  /** Number of reading-list entries on shujia tracking this series. */
  readers: number;
  /** Number of full reviews (with body) written on shujia. */
  reviews: number;
  /** Average rating on shujia (1-10 scale). null if no ratings yet. */
  avgRating: number | null;
}

interface RankInput {
  manga: MangaSummary;
  shujia: ShujiaSignals;
  /** Original position in MU's text-match order (0 = first hit). */
  position: number;
}

interface RankOptions {
  /** The user's raw query string. Used for title-exactness scoring. */
  query: string;
  /** Total candidates being ranked (used to scale position bonus). */
  total: number;
}

function exactnessScore(manga: MangaSummary, queryLower: string): number {
  if (!queryLower) return 0;
  const title = manga.title.toLowerCase();
  if (title === queryLower) return 1000;
  if (title.startsWith(queryLower)) return 500;
  if (title.includes(queryLower)) return 150;

  let altScore = 0;
  for (const alt of manga.altTitles) {
    const a = alt.toLowerCase();
    if (a === queryLower) altScore = Math.max(altScore, 800);
    else if (a.startsWith(queryLower)) altScore = Math.max(altScore, 350);
    else if (a.includes(queryLower)) altScore = Math.max(altScore, 80);
  }
  return altScore;
}

function muQualityScore(manga: MangaSummary): number {
  const bayesian = manga.bayesianRating ?? 0;
  const votes = manga.ratingVotes ?? 0;
  if (bayesian <= 0 || votes <= 0) return 0;
  // log10 keeps the curve gentle — going from 1k → 10k votes adds 1, not 9.
  return bayesian * Math.log10(1 + votes);
}

function shujiaQualityScore(signals: ShujiaSignals): number {
  // Reading-list trackers are the broadest signal — every reader counts.
  const readerScore = signals.readers * 0.6;
  // Reviews are stronger (they require effort) — count + quality both bump.
  const reviewScore = signals.reviews * 4;
  const ratingScore =
    signals.avgRating !== null
      ? signals.avgRating * signals.reviews * 0.4
      : 0;
  return readerScore + reviewScore + ratingScore;
}

export function scoreSearchHit(input: RankInput, opts: RankOptions): number {
  const queryLower = opts.query.trim().toLowerCase();
  const exactness = exactnessScore(input.manga, queryLower);
  const muQuality = muQualityScore(input.manga);
  const shujiaQuality = shujiaQualityScore(input.shujia);

  // Mild preserve-MU-order bias for ambiguous queries — when nothing else
  // distinguishes two hits, fall back to MU's own text-match order.
  const positionBonus = (opts.total - input.position) * 0.5;

  return exactness + muQuality + shujiaQuality + positionBonus;
}

export function rankSearchHits(
  hits: { manga: MangaSummary; shujia: ShujiaSignals }[],
  query: string,
): MangaSummary[] {
  const scored = hits.map((hit, position) => ({
    manga: hit.manga,
    score: scoreSearchHit(
      { manga: hit.manga, shujia: hit.shujia, position },
      { query, total: hits.length },
    ),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.manga);
}
