import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

// Common crawler / bot UA fragments. Doesn't need to be exhaustive — false
// negatives just mean a few bot views inflate counts slightly, which is
// tolerable for trending purposes. We err toward letting through ambiguous
// UAs because the cost of dropping a real reader is higher than the cost of
// counting a few extra bots.
const BOT_PATTERN =
  /bot|crawler|spider|scraper|fetcher|googlebot|bingbot|yandex|baiduspider|slurp|duckduckbot|facebookexternalhit|whatsapp|telegrambot|discordbot|twitterbot|applebot|petalbot|semrush|ahrefs|mj12bot|dotbot|gptbot|chatgpt-user|claudebot|anthropic|cohere|perplexity|amazonbot/i;

interface RecordOptions {
  provider: string;
  mangaId: string;
  userId?: string | null;
}

/**
 * Fire-and-forget page-view recorder. Designed to be wrapped in
 * `after()` from next/server so the user request never waits on it.
 * Silently swallows errors — a missed view is preferable to a failed
 * page render.
 *
 * No IP, no fingerprint, no UA stored — only (manga, provider, optional
 * userId, timestamp). Aggregate view counts are sufficient for trending.
 */
export async function recordMangaPageView({
  provider,
  mangaId,
  userId,
}: RecordOptions): Promise<void> {
  try {
    const headerList = await headers();
    const ua = headerList.get("user-agent") ?? "";
    if (!ua || BOT_PATTERN.test(ua)) return;

    await prisma.mangaPageView.create({
      data: {
        provider,
        mangaId,
        userId: userId ?? null,
      },
    });
  } catch {
    // Best-effort logging — never crash the page render.
  }
}
