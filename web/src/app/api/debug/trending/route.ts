/**
 * Diagnostic-only route. Returns a JSON dump of the trending pipeline
 * stages so we can tell whether the home rail is being fed by Reddit
 * (primary) or by MU week_pos (fallback) — without reading minds.
 *
 * Delete after the trending rail is verified working in production.
 */
import { NextResponse } from "next/server";

import { fetchRedditJson } from "@/lib/reddit/client";
import { getRedditMangaDiscussions } from "@/lib/reddit/manga-discussions";

export const dynamic = "force-dynamic";

interface RedditListingPayload {
  data?: { children?: { data?: { title?: string; score?: number } }[] };
}

export async function GET() {
  const proxyConfigured = Boolean(
    process.env.REDDIT_PROXY_URL && process.env.REDDIT_PROXY_SECRET,
  );

  // Stage 1: raw proxy probe — bypass module-level caches, hit Reddit
  // directly via the same client the trending pipeline uses.
  const raw = await fetchRedditJson<RedditListingPayload>(
    "/r/manga/top.json?t=week&limit=10",
  );
  const rawSample =
    raw?.data?.children
      ?.slice(0, 5)
      .map((c) => ({ title: c.data?.title ?? "", score: c.data?.score ?? 0 })) ??
    [];

  // Stage 2: cached discussion-extraction layer (this is what
  // reader-trending.ts consumes). If empty, trending falls through to MU.
  let discussions: Awaited<ReturnType<typeof getRedditMangaDiscussions>> = [];
  let discussionError: string | null = null;
  try {
    discussions = await getRedditMangaDiscussions();
  } catch (err) {
    discussionError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    proxyConfigured,
    rawProxyProbe: {
      gotPosts: rawSample.length,
      sample: rawSample,
    },
    discussions: {
      count: discussions.length,
      sample: discussions.slice(0, 10),
      error: discussionError,
    },
  });
}
