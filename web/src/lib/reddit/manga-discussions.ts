/**
 * Pulls top weekly chapter-discussion ([DISC]) threads from r/manga and
 * extracts the series titles. Each thread maps to a specific manga +
 * chapter (e.g. "[DISC] Berserk - Chapter 376") and the post score is
 * a real engagement signal — Reddit users vote on threads they care
 * about and read.
 *
 * Used as the home-page Trending source UNTIL shujia's own
 * MangaPageView data accumulates enough to power internal trending
 * (~4-6 weeks of normal traffic).
 */
import { unstable_cache } from "next/cache";

export interface DiscussionItem {
  title: string;
  score: number;
}

interface RedditPostData {
  title?: string;
  score?: number;
  num_comments?: number;
  link_flair_text?: string | null;
}

interface RedditPost {
  data?: RedditPostData;
}

interface RedditListing {
  data?: {
    children?: RedditPost[];
  };
}

// r/manga [DISC] post titles vary widely:
//   "[DISC] Berserk - Chapter 376"
//   "[DISC] Cool na Doukyuusei - 155"        (no "Chapter" word)
//   "[DISC] Mairimashita - Ch. 441 - Merize (5)"  (extra trailing chunk)
//   "[DISC] Habit (Oneshot by Holiday Yasumi)"    (oneshot, no number)
//   "[DISC] Iruma-kun Ch.441"                (no separator before Ch)
// Strategy: strip the [DISC] prefix, then chop off everything from the
// first sign of chapter / volume / oneshot / trailing-number metadata.
const DISC_PREFIX = /^\s*\[(?:disc|discussion|discuss)\]\s*/i;

// Cut points — first match wins. Order matters: try specific-word markers
// before falling back to bare separators with numbers.
const CHAPTER_CUT =
  /\s*[-—–:]?\s*(?:ch(?:apter)?\.?\s+\d|vol(?:ume)?\.?\s+\d|episode\s+\d|oneshot|one-shot|\(oneshot|end\b)/i;
// Bare " - 155" / " — 14" style — at least 2 digits or a leading 1-9 with
// nothing more telling. Avoids cutting on hyphenated words.
const BARE_NUMBER_CUT = /\s*[-—–]\s*\d+(?:[.\d]*)?(?:\s|$|\[|\()/;

function extractSeriesTitle(rawTitle: string): string | null {
  const stripped = rawTitle.replace(DISC_PREFIX, "");
  if (stripped === rawTitle) return null; // not a [DISC] post

  // Try CHAPTER_CUT first (more reliable signal of where the title ends).
  const chapMatch = stripped.match(CHAPTER_CUT);
  let cutAt = chapMatch?.index;
  if (cutAt === undefined) {
    const numMatch = stripped.match(BARE_NUMBER_CUT);
    cutAt = numMatch?.index;
  }

  let candidate = (
    cutAt !== undefined ? stripped.slice(0, cutAt) : stripped
  ).trim();

  // Clean up trailing punctuation, collapse whitespace
  candidate = candidate
    .replace(/\s+/g, " ")
    .replace(/[\s\-—–:,.]+$/, "")
    .trim();

  return candidate || null;
}

// r/manga has ~15× the subscriber count of r/manhwa, so raw upvote+comment
// scores from r/manga totally drown out manhwa even when manhwa series are
// more actively discussed within their community. To make the rail feel
// genuinely cross-region — and lean toward manhwa per shujia's audience —
// we apply per-subreddit weight multipliers. Tweak as the audiences shift.
const SUBREDDIT_WEIGHT: Record<"manga" | "manhwa", number> = {
  manga: 1,
  manhwa: 18,
};

async function fetchSubredditDiscussions(
  subreddit: "manga" | "manhwa",
): Promise<DiscussionItem[]> {
  const endpoint = `https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=100`;
  const weight = SUBREDDIT_WEIGHT[subreddit];
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        // Reddit asks for a descriptive UA; generic ones get 429'd.
        "User-Agent": "shujia/1.0 (+https://github.com/techmengg/shujia) trending-fetcher",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];

  let payload: RedditListing;
  try {
    payload = (await response.json()) as RedditListing;
  } catch {
    return [];
  }

  const posts = payload?.data?.children ?? [];
  if (!posts.length) return [];

  return posts
    .map((post) => {
      const title = post?.data?.title;
      if (!title) return null;
      const seriesName = extractSeriesTitle(title);
      if (!seriesName) return null;
      // Engagement weight: comments are a much stronger reading-signal than
      // upvotes (upvotes are low-effort drive-by, comments require having
      // read the chapter and forming an opinion). Weight comments 5x.
      const score = Math.max(1, post.data?.score ?? 0);
      const comments = Math.max(0, post.data?.num_comments ?? 0);
      const engagement = score + comments * 5;
      // Apply the subreddit-level weight (manhwa boosted to compete with
      // r/manga's much larger raw scores).
      return {
        title: seriesName,
        score: engagement * weight,
      };
    })
    .filter((x): x is DiscussionItem => x !== null);
}

async function fetchTopDiscussions(): Promise<DiscussionItem[]> {
  // Pull r/manga + r/manhwa in parallel — covers Japanese / Korean source
  // markets independently. r/manhua is too small (<1% the activity of
  // r/manga) to bother with for now.
  const [manga, manhwa] = await Promise.all([
    fetchSubredditDiscussions("manga"),
    fetchSubredditDiscussions("manhwa"),
  ]);
  const all = [...manga, ...manhwa];
  if (!all.length) return [];

  // Group across both subreddits: a series active in r/manga AND r/manhwa
  // (rare but possible — cross-posts) gets summed scores.
  const tally = new Map<string, { display: string; score: number }>();
  for (const item of all) {
    const key = item.title.toLowerCase();
    const existing = tally.get(key);
    if (existing) {
      existing.score += item.score;
    } else {
      tally.set(key, { display: item.title, score: item.score });
    }
  }

  return Array.from(tally.values())
    .sort((a, b) => b.score - a.score)
    .map((v) => ({ title: v.display, score: v.score }))
    // Wider pool: many candidates get dropped downstream by MU title
    // resolution + the rating-votes gate, so we need ~3-4x the final
    // limit here to land 20 surviving entries on the home rail.
    .slice(0, 80);
}

export const getRedditMangaDiscussions = unstable_cache(
  fetchTopDiscussions,
  // v4 — widened candidate pool from 30 → 80 so the home rail can land
  // its full target of 20 items after vote-gate + resolution attrition.
  ["reddit-trending-disc-week-v4"],
  { revalidate: 3600, tags: ["reddit-trending"] },
);
