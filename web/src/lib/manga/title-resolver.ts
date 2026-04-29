import type { MangaSummary } from "@/lib/manga/types";
import { searchSeries } from "@/lib/mangaupdates/service-cached";

/**
 * Resolve an external title (Reddit post, MangaBaka entry, etc.) to a
 * MangaUpdates summary so click-through lands on shujia's existing
 * /manga/<MU-id> detail pages. Confidence-scored — refuses bad matches
 * rather than falling back to MU's first relevance hit, which often
 * picks side stories / doujins / wrong-language entries.
 */

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

const SIDE_PRODUCT_RE =
  /\b(doujin|doujinshi|fan[- ]?made|fanmade|fanbook|art ?book|guide ?book|side ?story|spin[- ]?off|prequel|sequel ?\d|novel|light ?novel|webnovel|web ?novel|anthology|databook)\b/i;

interface ResolutionCandidate {
  summary: MangaSummary;
  confidence: number;
}

function scoreCandidate(
  seedTokens: string[],
  seedNorm: string,
  altSeeds: string[],
  candidate: MangaSummary,
): ResolutionCandidate {
  const candidateTitleNorm = normaliseTitle(candidate.title);
  const candidateTitleTokens = tokenize(candidate.title);
  const altTokenSets = (candidate.altTitles ?? []).map(tokenize);

  // Best Jaccard overlap with primary title or any alt title — also
  // try alt seeds (e.g. native_title from MangaBaka) for cross-language
  // matching.
  let bestOverlap = jaccard(seedTokens, candidateTitleTokens);
  for (const altTokens of altTokenSets) {
    const overlap = jaccard(seedTokens, altTokens);
    if (overlap > bestOverlap) bestOverlap = overlap;
  }
  for (const altSeed of altSeeds) {
    const altSeedTokens = tokenize(altSeed);
    const overlapPrimary = jaccard(altSeedTokens, candidateTitleTokens);
    if (overlapPrimary > bestOverlap) bestOverlap = overlapPrimary;
    for (const altTokens of altTokenSets) {
      const overlap = jaccard(altSeedTokens, altTokens);
      if (overlap > bestOverlap) bestOverlap = overlap;
    }
  }

  const altNormSet = new Set([
    seedNorm,
    ...altSeeds.map(normaliseTitle).filter(Boolean),
  ]);

  const exact =
    altNormSet.has(candidateTitleNorm) ||
    (candidate.altTitles ?? []).some((a) => altNormSet.has(normaliseTitle(a)));

  let confidence = exact ? 1 : bestOverlap;

  if (
    !exact &&
    confidence < 0.6 &&
    (candidateTitleNorm.includes(seedNorm) || seedNorm.includes(candidateTitleNorm))
  ) {
    confidence = Math.max(confidence, 0.6);
  }

  if (SIDE_PRODUCT_RE.test(candidate.title)) {
    confidence *= 0.5;
  } else if ((candidate.altTitles ?? []).some((a) => SIDE_PRODUCT_RE.test(a))) {
    confidence *= 0.85;
  }

  return { summary: candidate, confidence };
}

const DEFAULT_MIN_CONFIDENCE = 0.5;

export async function resolveTitleToMu(
  seedTitle: string,
  options?: { altTitles?: string[]; minConfidence?: number },
): Promise<MangaSummary | null> {
  const altTitles = (options?.altTitles ?? []).filter(Boolean);
  const minConfidence = options?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

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
    .map((c) => scoreCandidate(seedTokens, seedNorm, altTitles, c))
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  if (!best || best.confidence < minConfidence) return null;
  return best.summary;
}
