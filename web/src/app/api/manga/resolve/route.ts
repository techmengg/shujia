import { NextResponse } from "next/server";
import { z } from "zod";

import { MangaDexAPIError, searchManga } from "@/lib/mangadex/service";

// Simple in-memory cache per server instance
type CacheEntry = { id: string | null; ts: number };
const TITLE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const titleCache: Map<string, CacheEntry> =
  (globalThis as unknown as { __titleCache?: Map<string, CacheEntry> }).__titleCache ??
  new Map<string, CacheEntry>();
(globalThis as unknown as { __titleCache?: Map<string, CacheEntry> }).__titleCache = titleCache;

const inputSchema = z.object({
  items: z
    .array(
      z
        .object({
          title: z.string().optional(),
          url: z.string().optional(),
        })
        .strict(),
    )
    .min(1),
});

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function extractIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = String(url).match(/title\/([0-9a-f-]{6,})/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }
    const items = parsed.data.items;
    const out: Array<{ index: number; title?: string; mangaId: string | null }> = [];

    for (let i = 0; i < items.length; i += 1) {
      const { title, url } = items[i];
      const fromUrl = extractIdFromUrl(url);
      if (fromUrl) {
        out.push({ index: i, title, mangaId: fromUrl });
        continue;
      }
      if (!title || title.trim().length < 2) {
        out.push({ index: i, title, mangaId: null });
        continue;
      }
      const key = normalizeTitle(title);
      const cached = titleCache.get(key);
      if (cached && Date.now() - cached.ts < TITLE_CACHE_TTL_MS) {
        out.push({ index: i, title, mangaId: cached.id });
        continue;
      }
      try {
        const results = await searchManga(title, { limit: 1 });
        const id = results[0]?.id ?? null;
        titleCache.set(key, { id, ts: Date.now() });
        out.push({ index: i, title, mangaId: id });
      } catch (error) {
        if (error instanceof MangaDexAPIError && error.status === 404) {
          titleCache.set(key, { id: null, ts: Date.now() });
          out.push({ index: i, title, mangaId: null });
        } else {
          out.push({ index: i, title, mangaId: null });
        }
      }
    }

    return NextResponse.json(
      { data: out },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Bulk resolver failed", error);
    return NextResponse.json({ message: "Resolver failed." }, { status: 500 });
  }
}


