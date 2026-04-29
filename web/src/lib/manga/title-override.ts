import { prisma } from "@/lib/prisma";
import type { Provider } from "./types";

/**
 * Admin-set per-manga display-title overrides. Lets us replace MU/MD's
 * canonical title with a more recognizable one (e.g., MU returns
 * "Omniscient Reader" but the audience knows it as "Omniscient Reader's
 * Viewpoint"). Read-side only: the override is applied at the highest-
 * value surfaces — manga detail page and reading-list serialization.
 *
 * Cached in-process per request edge node for 60s to avoid hammering
 * the DB on hot pages. Cache is per-instance — the override propagates
 * on next refresh, not instantly across all serverless instances.
 */

const CACHE_TTL_MS = 60_000;

type CacheEntry = { value: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function key(provider: Provider, mangaId: string): string {
  return `${provider}:${mangaId}`;
}

export async function getTitleOverride(
  provider: Provider,
  mangaId: string,
): Promise<string | null> {
  const k = key(provider, mangaId);
  const cached = cache.get(k);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const row = await prisma.mangaTitleOverride.findUnique({
    where: { provider_mangaId: { provider, mangaId } },
    select: { title: true },
  });
  const value = row?.title ?? null;
  cache.set(k, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/** Batch lookup. Returns a Map keyed by `${provider}:${mangaId}` -> title. */
export async function getTitleOverrides(
  refs: { provider: Provider; mangaId: string }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!refs.length) return result;

  const dedup = new Map<string, { provider: Provider; mangaId: string }>();
  for (const r of refs) dedup.set(key(r.provider, r.mangaId), r);

  const rows = await prisma.mangaTitleOverride.findMany({
    where: {
      OR: Array.from(dedup.values()).map((r) => ({
        provider: r.provider,
        mangaId: r.mangaId,
      })),
    },
    select: { provider: true, mangaId: true, title: true },
  });
  for (const row of rows) {
    result.set(key(row.provider as Provider, row.mangaId), row.title);
  }
  return result;
}
