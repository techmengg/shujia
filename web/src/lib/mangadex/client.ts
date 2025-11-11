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

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export interface MangaDexRequestInit extends RequestInit {
  searchParams?: SearchParams;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
  retry?: RetryOptions;
}

export class MangaDexAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MangaDexAPIError";
    this.status = status;
  }
}

function parseRetryAfter(headerValue: string | null, fallbackMs: number): number {
  if (!headerValue) {
    return fallbackMs;
  }

  const seconds = Number.parseFloat(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.max(fallbackMs, seconds * 1000);
  }

  const dateTarget = Date.parse(headerValue);
  if (Number.isFinite(dateTarget)) {
    const diff = dateTarget - Date.now();
    if (diff > 0) {
      return Math.max(fallbackMs, diff);
    }
  }

  return fallbackMs;
}

function sleep(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function mangadexFetch<TResponse>(
  path: string,
  init: MangaDexRequestInit = {},
): Promise<TResponse> {
  const { searchParams, headers, retry, ...rest } = init;
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

  const attempts = Math.max(1, retry?.attempts ?? 5);
  const baseDelayMs = Math.max(0, retry?.baseDelayMs ?? 500);
  const maxDelayMs = Math.max(baseDelayMs, retry?.maxDelayMs ?? 5000);

  let attempt = 0;
  let nextDelay = baseDelayMs;

  while (attempt < attempts) {
    attempt += 1;

    let response: Response | null = null;
    try {
      response = await fetch(url, {
        ...rest,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...headers,
        },
      });
    } catch (networkError) {
      if (attempt >= attempts) {
        throw networkError;
      }
      await sleep(nextDelay);
      nextDelay = Math.min(nextDelay * 2, maxDelayMs);
      continue;
    }

    if (response.ok) {
      return response.json() as Promise<TResponse>;
    }

    const isRateLimited = response.status === 429;
    const isRetriableServerError = response.status >= 500 && response.status < 600;
    const shouldRetry = attempt < attempts && (isRateLimited || isRetriableServerError);

    if (shouldRetry) {
      const retryAfterMs = isRateLimited
        ? parseRetryAfter(response.headers.get("retry-after"), nextDelay)
        : nextDelay;

      await sleep(retryAfterMs);
      nextDelay = Math.min(
        isRateLimited ? retryAfterMs * 2 : nextDelay * 2,
        maxDelayMs,
      );
      continue;
    }

    let message = `MangaDex request failed (${response.status})`;

    try {
      const error: MangaDexErrorResponse = await response.json();
      message = error.errors?.[0]?.detail ?? message;
    } catch (error_) {
      console.error("Failed to parse MangaDex error response", error_);
    }

    throw new MangaDexAPIError(message, response.status);
  }

  throw new MangaDexAPIError("Exceeded MangaDex retry attempts", 429);
}
