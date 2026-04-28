import type { Provider } from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inferProviderFromId(id: string): Provider {
  return UUID_REGEX.test(id) ? "mangadex" : "mangaupdates";
}

export function providerLabel(provider: Provider): string {
  return provider === "mangadex" ? "MangaDex" : "MangaUpdates";
}

export function providerShortLabel(provider: Provider): string {
  return provider === "mangadex" ? "MD" : "MU";
}
