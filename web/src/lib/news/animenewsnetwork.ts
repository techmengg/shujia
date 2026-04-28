import { unstable_cache } from "next/cache";

export interface NewsHeadline {
  title: string;
  url: string;
  publishedAt: string | null;
}

const FEED_URL = "https://www.animenewsnetwork.com/all/rss.xml";
const MAX_ITEMS = 6;

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
      headers: { "User-Agent": "Mozilla/5.0 (compatible; shujia/1.0)" },
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

      const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : null;
      const url = linkMatch ? linkMatch[1].trim() : null;

      if (title && url) {
        items.push({
          title,
          url,
          publishedAt: dateMatch ? dateMatch[1].trim() : null,
        });
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
