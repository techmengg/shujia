import { unstable_cache } from "next/cache";

export interface NewsHeadline {
  title: string;
  url: string;
  publishedAt: string | null;
  thumbnailUrl?: string | null;
  /** Short body / RSS description / Reddit selftext excerpt for the rail. */
  description?: string | null;
  /** Reddit upvote count for the post. Undefined for non-Reddit sources. */
  score?: number;
}

const FEED_URL = "https://www.animenewsnetwork.com/all/rss.xml";
const MAX_ITEMS = 6;
// ANN RSS items don't carry image fields, so for the home-page news rail
// we scrape og:image from the top few article pages. Bounded so we don't
// blow up the page render on a slow ANN.
const THUMBNAIL_HYDRATION_LIMIT = 3;
// Browser-style UA — ANN's edge layer 403s on generic curl/wget UAs.
const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function scrapeOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": FETCH_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Try og:image, then twitter:image, then image_src — that's the
    // priority order most CMSes write meta tags in.
    const patterns = [
      /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image(?::secure_url)?["']/i,
      /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

const getOgImage = unstable_cache(scrapeOgImage, ["ann-og-image-v1"], {
  // Article images don't change after publish — cache for a day.
  revalidate: 86400,
  tags: ["ann-og-image"],
});

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchNews(): Promise<NewsHeadline[]> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": FETCH_UA, Accept: "application/rss+xml,application/xml,text/xml" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const text = await res.text();
    const items: NewsHeadline[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;

    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(text)) !== null && items.length < MAX_ITEMS) {
      const block = match[1];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);

      const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : null;
      const url = linkMatch ? linkMatch[1].trim() : null;
      const description = descMatch
        ? // ANN descriptions sometimes carry inline HTML (cite tags etc.) —
          // strip them for a clean text excerpt.
          decodeEntities(descMatch[1])
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim() || null
        : null;

      if (title && url) {
        items.push({
          title,
          url,
          publishedAt: dateMatch ? dateMatch[1].trim() : null,
          thumbnailUrl: null,
          description,
        });
      }
    }

    // Enrich the top N with og:image so the home news rail can render
    // proper thumbnails. og:image is cached individually (1d) so this
    // is cheap on repeat — only first article fetch ever pays the cost.
    if (items.length) {
      const hydratable = items.slice(0, THUMBNAIL_HYDRATION_LIMIT);
      const thumbnails = await Promise.all(
        hydratable.map((item) => getOgImage(item.url)),
      );
      for (let i = 0; i < hydratable.length; i++) {
        items[i].thumbnailUrl = thumbnails[i];
      }
    }

    return items;
  } catch {
    return [];
  }
}

export const getComicsNews = unstable_cache(fetchNews, ["ann-rss-news"], {
  revalidate: 3600,
  tags: ["ann-rss-news"],
});
