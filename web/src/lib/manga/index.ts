import * as mangadex from "@/lib/mangadex/service-cached";
import * as mangaupdates from "@/lib/mangaupdates/service-cached";
import type { MangaDetails, MangaSummary, Provider } from "./types";

export type { MangaDetails, MangaSummary, Provider } from "./types";
export {
  inferProviderFromId,
  providerLabel,
  providerShortLabel,
} from "./provider";

export const ALL_PROVIDERS: Provider[] = ["mangadex", "mangaupdates"];

export interface SearchMangaOptions {
  limit?: number;
  providers?: Provider[];
}

export async function searchManga(
  query: string,
  options: SearchMangaOptions = {},
): Promise<MangaSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const providers = options.providers ?? ALL_PROVIDERS;
  const limit = options.limit;

  const tasks = providers.map((provider) => runSearch(provider, trimmed, limit));
  const settled = await Promise.allSettled(tasks);

  const merged: MangaSummary[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      merged.push(...result.value);
    } else {
      console.warn(
        `searchManga: ${providers[index]} failed — ${String(result.reason)}`,
      );
    }
  });
  return merged;
}

function runSearch(
  provider: Provider,
  query: string,
  limit?: number,
): Promise<MangaSummary[]> {
  switch (provider) {
    case "mangadex":
      return mangadex.searchManga(query, limit);
    case "mangaupdates":
      return mangaupdates.searchSeries(query, limit);
  }
}

export async function getMangaSummaryById(
  id: string,
  provider: Provider,
): Promise<MangaSummary | null> {
  switch (provider) {
    case "mangadex":
      return mangadex.getMangaSummaryById(id);
    case "mangaupdates":
      return mangaupdates.getSeriesSummaryById(id);
  }
}

export async function getMangaDetails(
  id: string,
  provider: Provider,
): Promise<MangaDetails | null> {
  switch (provider) {
    case "mangadex":
      return mangadex.getMangaDetails(id);
    case "mangaupdates":
      return mangaupdates.getSeriesDetailsById(id);
  }
}
