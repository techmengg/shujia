/**
 * Reddit JSON fetcher.
 *
 * Reddit aggressively rate-limits / blocks unauthenticated requests
 * originating from cloud-IP ranges (Vercel, AWS, GCP), so the public
 * `www.reddit.com/r/<sub>/top.json` endpoints routinely return 403 / 429
 * from a serverless function even though they work fine from a developer
 * laptop.
 *
 * Workaround: route production traffic through a tiny Cloudflare Worker
 * (see `tools/reddit-proxy/`). CF edge IPs aren't gated by Reddit the
 * same way Vercel's are, and the Worker preserves the full JSON shape
 * (upvote scores, comment counts, flair) that powers the home rails.
 *
 * When `REDDIT_PROXY_URL` is unset (local dev) we hit www.reddit.com
 * directly, which works fine from a developer machine.
 */
const FETCH_UA =
  "shujia/1.0 (+https://github.com/techmengg/shujia) reddit-fetcher";

export async function fetchRedditJson<T>(path: string): Promise<T | null> {
  const proxyUrl = process.env.REDDIT_PROXY_URL;
  const proxySecret = process.env.REDDIT_PROXY_SECRET;

  let target: string;
  const headers: Record<string, string> = {
    "User-Agent": FETCH_UA,
    Accept: "application/json",
  };

  if (proxyUrl) {
    const base = proxyUrl.replace(/\/+$/, "");
    target = `${base}/?path=${encodeURIComponent(path)}`;
    if (proxySecret) headers["x-shujia-secret"] = proxySecret;
  } else {
    target = `https://www.reddit.com${path}`;
  }

  let response: Response;
  try {
    response = await fetch(target, {
      headers,
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
