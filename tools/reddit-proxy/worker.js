/**
 * shujia Reddit proxy — Cloudflare Worker.
 *
 * Reddit blocks / heavily rate-limits unauthenticated requests from
 * Vercel/AWS/GCP cloud-IP egress. CF Workers run from Cloudflare's edge
 * network, which Reddit doesn't gate the same way, so this tiny proxy
 * lets shujia keep using Reddit's public `.json` listings (full JSON
 * including upvote scores + comment counts + flair) from production.
 *
 * Deploy:
 *   1. npm i -g wrangler
 *   2. cd tools/reddit-proxy
 *   3. wrangler login
 *   4. wrangler secret put SHUJIA_PROXY_SECRET  # paste any random 32+ char string
 *   5. wrangler deploy
 *   6. Note the deployed URL, set REDDIT_PROXY_URL + REDDIT_PROXY_SECRET in
 *      Vercel env vars.
 *
 * The shared-secret check prevents random internet traffic from billing
 * your Worker requests against your free quota.
 */

const REDDIT_BASE = "https://www.reddit.com";

// Reddit asks for descriptive User-Agents; generic / curl-default UAs get
// 429'd or returned weirdly truncated payloads.
const FETCH_UA =
  "shujia/1.0 (+https://github.com/techmengg/shujia) reddit-proxy";

export default {
  async fetch(request, env) {
    if (request.method !== "GET") {
      return new Response("method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    if (!path || !path.startsWith("/r/") || !path.includes(".json")) {
      return new Response(
        "bad request: pass `?path=/r/<sub>/<endpoint>.json?...`",
        { status: 400 },
      );
    }

    // Shared-secret gate — required so randos who discover the worker URL
    // can't burn through your Cloudflare free-tier request budget.
    const expected = env.SHUJIA_PROXY_SECRET;
    if (expected) {
      const got = request.headers.get("x-shujia-secret");
      if (got !== expected) return new Response("forbidden", { status: 403 });
    }

    let upstream;
    try {
      upstream = await fetch(`${REDDIT_BASE}${path}`, {
        headers: {
          "User-Agent": FETCH_UA,
          Accept: "application/json",
        },
        // Edge-cache the response so repeat hits within a 5-minute window
        // never re-poll Reddit. shujia caches for 1h on its end too.
        cf: { cacheTtl: 300, cacheEverything: true },
      });
    } catch {
      return new Response("upstream error", { status: 502 });
    }

    // Stream the body straight through. Reddit returns gzip+JSON; we keep
    // the original Content-Type and add a small public cache header.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};
