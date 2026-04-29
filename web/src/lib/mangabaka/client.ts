/**
 * Lightweight MangaBaka client. Used for the home "New releases" rail —
 * MangaBaka has clean publication-date filters (`published_start_date_lower`)
 * which the MangaUpdates API doesn't expose, so it's the right source for
 * "series that started publishing in the last N months".
 *
 * Spec: see MangaBaka.json at the repo root (OpenAPI 3.0). All endpoints
 * are public, no auth required for read queries.
 */
import { unstable_cache } from "next/cache";

const API_BASE = "https://api.mangabaka.dev";

export interface MangaBakaSeries {
  id: number;
  title: string;
  altTitles: string[];
  coverUrl: string | null;
  startDate: string | null; // YYYY-MM-DD
  year: number | null;
  rating: number | null;
  type: string; // manga / manhwa / manhua / oel / ...
  contentRating: string;
  status: string | null; // releasing / upcoming / completed / hiatus / ...
  totalChapters: string | null;
}

interface SecondaryTitleEntry {
  title?: string | null;
  note?: string | null;
  type?: string | null;
}

interface SearchResponseSeries {
  id?: number;
  state?: string;
  title?: string;
  romanized_title?: string | null;
  native_title?: string | null;
  // Reality: each language key maps to an array of title objects, not
  // bare strings. Spec was misleading.
  secondary_titles?: Record<string, SecondaryTitleEntry[]> | null;
  cover?: {
    raw?: { url?: string | null };
    x150?: { x1?: string | null };
    x250?: { x1?: string | null };
    x500?: { x1?: string | null };
  } | null;
  year?: number | null;
  published?: { start_date?: string | null } | null;
  rating?: number | null;
  type?: string;
  content_rating?: string;
  status?: string;
  total_chapters?: string | number | null;
}

interface SearchResponse {
  status?: number;
  data?: SearchResponseSeries[];
}

function pickCover(s: SearchResponseSeries): string | null {
  // Prefer scaled assets — the raw original is huge and unnecessary for a
  // home rail. x250 → x150 → x500 → raw.
  return (
    s.cover?.x250?.x1 ??
    s.cover?.x150?.x1 ??
    s.cover?.x500?.x1 ??
    s.cover?.raw?.url ??
    null
  );
}

// Common English function words. Used to score whether a candidate title is
// English vs romanized CJK. MangaBaka's API returns `title` as the romanized
// form for many series ("Utsu Tenkai Daisuki Shujinkou..."), with the English
// title buried in `secondary_titles` as a `type: "unknown"` entry. Their own
// site picks the English one — we replicate that here.
const ENGLISH_STOPWORDS = new Set([
  "the", "of", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with",
  "from", "by", "is", "are", "was", "were", "be", "been", "being", "i", "my",
  "me", "you", "your", "we", "our", "us", "he", "him", "his", "she", "her",
  "it", "its", "they", "them", "their", "this", "that", "these", "those",
  "who", "whom", "what", "which", "where", "when", "why", "how", "but", "not",
  "no", "all", "any", "some", "as", "if", "than", "then", "so", "do", "does",
  "did", "have", "has", "had", "will", "would", "can", "could", "should",
  "into", "out", "up", "down", "over", "under", "about", "after", "before",
  "between", "without", "within", "again", "more", "most", "very", "much",
  "only", "own", "same", "such", "too", "also", "even", "still", "ever",
  "never", "just", "now", "here", "there", "vs",
]);

function isLatinAscii(t: string): boolean {
  return /^[\x20-\x7E]+$/.test(t);
}

// Suffixes that are extremely characteristic of English (rare in Japanese
// romaji or Korean transliteration). A token ending in one of these is a
// strong English signal even if no stopword is present (e.g. "Lingering").
const ENGLISH_SUFFIXES = [
  "ing", "tion", "ment", "ness", "able", "ible", "ous", "ful", "less",
  "ship", "hood", "ward", "wise", "ery", "ary", "ory", "ity",
];

// Small set of common English content words used as a positive signal for
// short titles where stopwords + suffixes aren't enough (e.g. "Lingering
// Pain" → "pain" is in here, "Silent Hill" → "silent"/"hill" both in here).
const ENGLISH_HINT_WORDS = new Set([
  "pain", "love", "war", "hero", "god", "gods", "king", "queen", "blood",
  "dark", "light", "world", "magic", "life", "death", "star", "moon", "sun",
  "sword", "knight", "demon", "angel", "soul", "souls", "heart", "fire",
  "ice", "shadow", "shadows", "dragon", "dragons", "beast", "beasts", "wolf",
  "wolves", "tiger", "lion", "spirit", "spirits", "ghost", "ghosts", "witch",
  "wizard", "mage", "mages", "saint", "saints", "lord", "lady", "prince",
  "princess", "boy", "girl", "man", "woman", "child", "children", "father",
  "mother", "sister", "brother", "friend", "enemy", "hunter", "hunters",
  "killer", "warrior", "warriors", "savior", "tale", "tales", "story",
  "stories", "song", "songs", "dream", "dreams", "night", "day", "dawn",
  "dusk", "silence", "silent", "hill", "hills", "mountain", "river", "ocean",
  "sea", "sky", "earth", "land", "city", "town", "village", "kingdom",
  "empire", "throne", "crown", "blade", "axe", "spear", "bow", "arrow",
  "rose", "lily", "sand", "stone", "iron", "steel", "gold", "silver",
  "crystal", "jewel", "rain", "snow", "storm", "wind", "thunder", "wave",
  "memory", "memories", "secret", "secrets", "lie", "lies", "truth", "hope",
  "fear", "hate", "kiss", "tear", "tears", "smile", "voice", "name", "names",
  "lost", "found", "fallen", "rising", "broken", "hidden", "cursed",
  "blessed", "sacred", "holy", "divine", "eternal", "endless", "forgotten",
  "school", "academy", "office", "park", "garden", "house", "home", "road",
  "journey", "quest", "adventure", "regressor", "regression", "reincarnation",
  "summoner", "summoned", "novel", "manga", "manhwa", "manhua", "comic",
  "vs", "versus", "and", "of", "the",
]);

function englishness(t: string): number {
  if (!t || !isLatinAscii(t)) return -1;
  const tokens = t
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (!tokens.length) return -1;

  let stopHits = 0;
  let suffixHits = 0;
  let hintHits = 0;
  let romajiHits = 0;
  for (const tok of tokens) {
    if (ENGLISH_STOPWORDS.has(tok)) stopHits++;
    if (ENGLISH_HINT_WORDS.has(tok)) hintHits++;
    if (tok.length >= 5) {
      for (const suf of ENGLISH_SUFFIXES) {
        if (tok.endsWith(suf)) {
          suffixHits++;
          break;
        }
      }
    }
    // Romaji-suffix tells: -kun, -chan, -san, -sama, -dono, -senpai, -sensei
    // are honorifics that effectively never appear in real English titles.
    if (/(?:^|-)(?:kun|chan|san|sama|dono|senpai|sensei)$/.test(tok)) {
      romajiHits++;
    }
  }

  const positive = stopHits + suffixHits + hintHits;
  const score = positive / tokens.length + positive * 0.05 - romajiHits * 1.5;
  return score;
}

interface EnglishPick {
  title: string;
  score: number;
}

function pickEnglishTitle(s: SearchResponseSeries): EnglishPick | null {
  const candidates: string[] = [];
  if (s.title) candidates.push(s.title.trim());
  if (s.romanized_title) candidates.push(s.romanized_title.trim());
  if (s.secondary_titles) {
    for (const arr of Object.values(s.secondary_titles)) {
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const t = entry?.title?.trim();
        if (t) candidates.push(t);
      }
    }
  }
  let best = "";
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (!c) continue;
    const score = englishness(c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (!best) return null;
  return { title: best, score: bestScore };
}

function collectAltTitles(s: SearchResponseSeries): string[] {
  const out = new Set<string>();
  if (s.title) out.add(s.title.trim());
  if (s.native_title) out.add(s.native_title.trim());
  if (s.romanized_title) out.add(s.romanized_title.trim());
  if (s.secondary_titles) {
    for (const arr of Object.values(s.secondary_titles)) {
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const t = entry?.title?.trim();
        if (t) out.add(t);
      }
    }
  }
  out.delete("");
  return Array.from(out).slice(0, 12);
}

interface NewReleasesOptions {
  monthsBack: number;
  limit: number;
}

async function fetchNewReleases({
  monthsBack,
  limit,
}: NewReleasesOptions): Promise<MangaBakaSeries[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const params = new URLSearchParams();
  params.set("published_start_date_lower", cutoffStr);
  // Match MangaBaka's own "New releases" page — sorted by publication start
  // date descending so the freshest series surface first (Upcoming/Releasing
  // 2026 entries with low chapter counts), exactly what users expect.
  params.set("sort_by", "published_start_date_desc");
  // SFW — skip erotica + pornographic.
  params.append("content_rating", "safe");
  params.append("content_rating", "suggestive");
  // Comics only — skip novels.
  params.append("type", "manga");
  params.append("type", "manhwa");
  params.append("type", "manhua");
  params.append("type", "oel");
  params.set("limit", String(limit));

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/v1/series/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "shujia/1.0 (+https://github.com/techmengg/shujia) new-releases-fetcher",
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];

  let payload: SearchResponse;
  try {
    payload = (await response.json()) as SearchResponse;
  } catch {
    return [];
  }
  if (!Array.isArray(payload.data)) return [];

  // Drop entries with obviously-garbage publication dates more than 2 years
  // in the future (MB has a few rows with placeholder years like 2054).
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 2);
  const farFutureStr = farFuture.toISOString().slice(0, 10);

  return payload.data
    .filter((s) => s.id && s.state !== "merged")
    .filter((s) => {
      const d = s.published?.start_date;
      return !d || d <= farFutureStr;
    })
    .map((s) => {
      // MB returns `title` as the romanized form for many fresh entries
      // ("Utsu Tenkai Daisuki Shujinkou...", "Bultan Samagui Moraesulsa")
      // with the English title buried in `secondary_titles`. Their own
      // website picks the English one — pickEnglishTitle scores candidates
      // by density of English stopwords / suffixes / common nouns and
      // returns null when nothing scores positively (i.e. the series
      // genuinely has no English title yet). Those nulls drop out below.
      const pick = pickEnglishTitle(s);
      if (!pick || pick.score <= 0) return null;
      const totalCh =
        s.total_chapters == null
          ? null
          : typeof s.total_chapters === "number"
            ? String(s.total_chapters)
            : s.total_chapters.trim() || null;
      return {
        id: s.id!,
        title: pick.title,
        altTitles: collectAltTitles(s).filter((t) => t !== pick.title),
        coverUrl: pickCover(s),
        startDate: s.published?.start_date ?? null,
        year: s.year ?? null,
        rating: s.rating ?? null,
        type: s.type ?? "manga",
        contentRating: s.content_rating ?? "safe",
        status: s.status?.trim() || null,
        totalChapters: totalCh,
      } satisfies MangaBakaSeries;
    })
    .filter((s): s is MangaBakaSeries => s !== null);
}

export const getMangaBakaNewReleases = unstable_cache(
  // Pull a wider candidate pool — the English-title filter + downstream MU
  // resolution both drop a meaningful fraction of MB's response. 60 in
  // gives us a healthy margin to land 12 cards.
  () => fetchNewReleases({ monthsBack: 12, limit: 60 }),
  // v6 — bumped after tightening the English-title heuristic (suffix +
  // hint-word signals, romaji honorific penalty) and dropping entries that
  // have no English title at all so the rail no longer surfaces "Yamenaide,
  // Chayama-kun" / "Saseba naru" / "Gyakusatsu Kigen" placeholders.
  ["mangabaka-new-releases-12m-v6"],
  { revalidate: 21600, tags: ["mangabaka-new-releases"] },
);
