/**
 * Pulls top weekly [NEWS] posts from r/manhwa for the home news rail.
 *
 * r/manhwa is small enough (~200K subs) that "top of week" is a tightly
 * curated set — community moderators tag NEWS with the [NEWS] flair, so
 * these are real announcements (anime adaptations, license news, season
 * 2/3 confirmations) rather than random links.
 *
 * Free, no auth, same Reddit JSON endpoint as the trending rail.
 */
import { unstable_cache } from "next/cache";

export interface ManhwaNewsItem {
  title: string;
  url: string; // External link target (or Reddit permalink for self posts)
  publishedAt: string; // ISO timestamp
  thumbnailUrl: string | null;
  description: string | null; // Selftext excerpt
  score: number;
}

interface RedditMediaMetadataEntry {
  s?: { u?: string };
}

interface RedditPostData {
  title?: string;
  url?: string;
  permalink?: string;
  selftext?: string;
  link_flair_text?: string | null;
  created_utc?: number;
  is_self?: boolean;
  thumbnail?: string;
  preview?: {
    images?: { source?: { url?: string } }[];
  };
  media_metadata?: Record<string, RedditMediaMetadataEntry>;
  crosspost_parent_list?: {
    preview?: { images?: { source?: { url?: string } }[] };
  }[];
  score?: number;
  num_comments?: number;
}

interface RedditPost {
  data?: RedditPostData;
}

interface RedditListing {
  data?: { children?: RedditPost[] };
}

const ENDPOINT = "https://www.reddit.com/r/manhwa/top.json?t=week&limit=100";
const FETCH_UA =
  "shujia/1.0 (+https://github.com/techmengg/shujia) news-fetcher";
const NEWS_PREFIX = /^\s*\[(news|announcement|ann)\]\s*/i;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function pickThumbnail(post: RedditPostData): string | null {
  // 1. Standard preview image — highest-quality option for link posts.
  const previewUrl = post.preview?.images?.[0]?.source?.url;
  if (previewUrl) return decodeHtmlEntities(previewUrl);

  // 2. Gallery posts use `media_metadata` keyed by image id; first entry
  //    is good enough for a thumbnail. Source field `s.u` is HTML-encoded.
  if (post.media_metadata) {
    const firstKey = Object.keys(post.media_metadata)[0];
    const meta = firstKey ? post.media_metadata[firstKey] : null;
    const url = meta?.s?.u;
    if (url) return decodeHtmlEntities(url);
  }

  // 3. Crossposts: the original poster's preview, not the cross-poster's.
  const crossUrl =
    post.crosspost_parent_list?.[0]?.preview?.images?.[0]?.source?.url;
  if (crossUrl) return decodeHtmlEntities(crossUrl);

  // 4. Fallback to the small `thumbnail` field. Sometimes a real URL,
  //    sometimes a sentinel string we filter out.
  const thumb = post.thumbnail;
  if (
    thumb &&
    thumb.startsWith("http") &&
    !["self", "default", "nsfw", "image", "spoiler"].includes(thumb)
  ) {
    return thumb;
  }
  return null;
}

async function fetchManhwaNews(): Promise<ManhwaNewsItem[]> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      headers: { "User-Agent": FETCH_UA, Accept: "application/json" },
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

  const items: ManhwaNewsItem[] = [];
  for (const post of posts) {
    const data = post?.data;
    if (!data?.title) continue;

    // Match either the [NEWS] flair OR a [NEWS] / [Announcement] title prefix.
    const flair = (data.link_flair_text ?? "").toLowerCase();
    const flairIsNews = flair === "news" || flair === "announcement";
    const titleHasNewsPrefix = NEWS_PREFIX.test(data.title);
    if (!flairIsNews && !titleHasNewsPrefix) continue;

    const cleanTitle = data.title.replace(NEWS_PREFIX, "").trim();
    if (!cleanTitle) continue;

    // For self-posts, link to the Reddit thread itself; for link-posts,
    // link straight to the article.
    const url = data.is_self
      ? `https://www.reddit.com${data.permalink ?? ""}`
      : data.url ?? null;
    if (!url) continue;

    const selftext = data.selftext?.trim() ?? "";
    const description = selftext
      ? // Markdown remnants are noisy in a small excerpt — strip the
        // most common ones (links, formatting, line breaks).
        selftext
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/[*_~`>]/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : null;

    items.push({
      title: cleanTitle,
      url,
      publishedAt: data.created_utc
        ? new Date(data.created_utc * 1000).toISOString()
        : new Date().toISOString(),
      thumbnailUrl: pickThumbnail(data),
      description,
      score: Math.max(0, data.score ?? 0),
    });
  }
  return items;
}

export const getManhwaNews = unstable_cache(
  fetchManhwaNews,
  // v2 — bumped after extending the captured fields (selftext +
  // score) and the thumbnail picker (gallery + crosspost fallbacks).
  ["reddit-r-manhwa-news-week-v2"],
  { revalidate: 3600, tags: ["reddit-manhwa-news"] },
);
