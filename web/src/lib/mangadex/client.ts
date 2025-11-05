import type { MangaDexErrorResponse } from "./types";

const DEFAULT_API_BASE = "https://api.mangadex.org";
const USER_AGENT =
  "Shujia/0.1 (+https://github.com/aingt/shujiadb; contact@localhost)";

const API_BASE =
  process.env.MANGADEX_API_BASE ??
  process.env.NEXT_PUBLIC_MANGADEX_API_BASE ??
  DEFAULT_API_BASE;

export const COVER_ART_BASE_URL = "https://uploads.mangadex.org/covers";

type Primitive = string | number | boolean;

type SearchParams =
  | Record<string, Primitive | Primitive[] | undefined>
  | undefined;

export interface MangaDexRequestInit extends RequestInit {
  searchParams?: SearchParams;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

export class MangaDexAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MangaDexAPIError";
    this.status = status;
  }
}

export async function mangadexFetch<TResponse>(
  path: string,
  init: MangaDexRequestInit = {},
): Promise<TResponse> {
  const { searchParams, headers, ...rest } = init;
  const url = new URL(path, API_BASE);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        value.forEach((item) =>
          url.searchParams.append(key, String(item)),
        );
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      ...headers,
    },
  });

  if (!response.ok) {
    let message = `MangaDex request failed (${response.status})`;

    try {
      const error: MangaDexErrorResponse = await response.json();
      message = error.errors?.[0]?.detail ?? message;
    } catch (error_) {
      console.error("Failed to parse MangaDex error response", error_);
    }

    throw new MangaDexAPIError(message, response.status);
  }

  return response.json() as Promise<TResponse>;
}
