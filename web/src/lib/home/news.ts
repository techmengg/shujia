/**
 * Home-page news source. Combines r/manhwa [NEWS] posts (community-curated
 * manhwa announcements — usually adaptation news, license updates, season
 * confirmations) with ANN headlines as a fallback when Reddit is empty.
 *
 * Returns the unified shape the home `<NewsSection />` expects.
 */
import { getComicsNews, type NewsHeadline } from "@/lib/news/animenewsnetwork";
import { getManhwaNews } from "@/lib/reddit/manhwa-news";

const TARGET_COUNT = 4;

export async function getHomeNews(): Promise<NewsHeadline[]> {
  const reddit = await getManhwaNews().catch(() => []);

  const fromReddit: NewsHeadline[] = reddit.map((r) => ({
    title: r.title,
    url: r.url,
    publishedAt: r.publishedAt,
    thumbnailUrl: r.thumbnailUrl,
    description: r.description,
    score: r.score,
  }));

  if (fromReddit.length >= TARGET_COUNT) {
    return fromReddit.slice(0, TARGET_COUNT);
  }

  // Top up with ANN — even if Reddit gives 0 or 1 manhwa news items this
  // week, the rail still has 3 entries.
  const ann = await getComicsNews().catch(() => []);
  const seen = new Set(fromReddit.map((r) => r.url));
  const merged: NewsHeadline[] = [...fromReddit];
  for (const item of ann) {
    if (seen.has(item.url)) continue;
    merged.push(item);
    if (merged.length >= TARGET_COUNT) break;
  }
  return merged.slice(0, TARGET_COUNT);
}
