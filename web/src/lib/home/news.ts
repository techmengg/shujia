/**
 * Home-page news source. r/manhwa is the primary feed — its [NEWS]-flaired
 * weekly + monthly top posts are real announcements (anime adaptations,
 * license updates, season confirmations) curated by the community. ANN is
 * a hard fallback only used when Reddit returns nothing at all (network
 * outage, OAuth misconfig, etc.).
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

  // Reddit-primary: as long as Reddit returns anything at all, fill the
  // entire rail from r/manhwa. We only reach for ANN when Reddit is
  // completely empty (typically a network/auth outage on Vercel).
  if (fromReddit.length > 0) {
    return fromReddit.slice(0, TARGET_COUNT);
  }

  const ann = await getComicsNews().catch(() => []);
  return ann.slice(0, TARGET_COUNT);
}
