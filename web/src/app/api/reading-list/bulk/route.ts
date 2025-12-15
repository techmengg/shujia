import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMangaSummaryById } from "@/lib/manga-service";

const BULK_LIMIT = 150;

const bulkSchema = z.object({
  items: z
    .array(
      z
        .object({
          mangaId: z.string().min(1),
          progress: z.string().optional(),
          rating: z.number().min(0).max(10).optional(),
          notes: z.string().optional(),
          // Optional metadata to skip MangaUpdates fetch when available
          title: z.string().optional(),
          altTitles: z.array(z.string()).optional(),
          description: z.string().nullable().optional(),
          status: z.string().nullable().optional(),
          demographic: z.string().nullable().optional(),
          year: z.number().nullable().optional(),
          contentRating: z.string().nullable().optional(),
          latestChapter: z.string().nullable().optional(),
          languages: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          coverImage: z.string().nullable().optional(),
          url: z.string().optional(),
        })
        .strict(),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to modify your reading list." },
        { status: 401 },
      );
    }
    const userId = user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
    }

    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const items = parsed.data.items;
    const incoming = items.slice(0, BULK_LIMIT);
    // De-dupe by mangaId (last wins)
    const seen = new Map<string, { progress?: string; rating?: number; notes?: string }>();
    for (const item of incoming) {
      seen.set(item.mangaId, {
        ...(item.progress ? { progress: item.progress } : {}),
        ...(typeof item.rating === "number" ? { rating: item.rating } : {}),
        ...(item.notes ? { notes: item.notes } : {}),
      });
    }

    const mangaIds = Array.from(seen.keys());

    // Fetch existing entries to decide which require full metadata load
    const existing = await prisma.readingListEntry.findMany({
      where: { userId, mangaId: { in: mangaIds } },
      select: { mangaId: true },
    });
    const existingIds = new Set(existing.map((e) => e.mangaId));

    const toUpdate = mangaIds.filter((id) => existingIds.has(id));
    const toCreate = mangaIds.filter((id) => !existingIds.has(id));

    let updated = 0;
    let added = 0;
    let skipped = 0;

    // Perform updates
    if (toUpdate.length) {
      await prisma.$transaction(
        toUpdate.map((mangaId) => {
          const patch = seen.get(mangaId) || {};
          const data: Prisma.ReadingListEntryUpdateInput = {};
          if ("progress" in patch) data.progress = (patch.progress ?? null) as string | null;
          if ("rating" in patch)
            data.rating =
              typeof patch.rating === "number" && Number.isFinite(patch.rating)
                ? patch.rating
                : null;
          if ("notes" in patch) data.notes = (patch.notes ?? null) as string | null;
          return prisma.readingListEntry.updateMany({
            where: { userId, mangaId },
            data,
          });
        })
      );
      updated = toUpdate.length;
    }

    // Create new entries; use provided metadata when available, otherwise fetch from MangaUpdates.
    async function* idGenerator() {
      for (const id of toCreate) yield id;
    }
    const concurrency = 4;
    const iterator = idGenerator();
    async function runWorker() {
      while (true) {
        const next = await iterator.next();
        if (next.done) break;
        const mangaId = next.value as string;
        try {
          const patch = seen.get(mangaId) || {};
          const provided = (items.find((i) => i.mangaId === mangaId) ??
            {}) as z.infer<typeof bulkSchema>["items"][number];

          if (provided.title || provided.url) {
            // Use provided metadata first
            let base = {
              title: provided.title ?? mangaId,
              altTitles: provided.altTitles ?? [],
              description: provided.description ?? null,
              status: provided.status ?? null,
              year: provided.year ?? null,
              contentRating: provided.contentRating ?? null,
              demographic: provided.demographic ?? null,
              latestChapter: provided.latestChapter ?? null,
              languages: provided.languages ?? [],
              tags: provided.tags ?? [],
              coverImage: provided.coverImage ?? null,
              url: provided.url ?? `https://www.mangaupdates.com/series/${mangaId}`,
            };
            // If critical fields like cover/title are missing, hydrate from MangaUpdates (cached)
            if (!base.coverImage || !base.title) {
              try {
                const summary = await getMangaSummaryById(mangaId);
                if (summary) {
                  base = {
                    ...base,
                    title: base.title || summary.title,
                    altTitles: base.altTitles.length ? base.altTitles : summary.altTitles,
                    description: base.description ?? summary.description ?? null,
                    status: base.status ?? summary.status ?? null,
                    year: base.year ?? summary.year ?? null,
                    contentRating: base.contentRating ?? summary.contentRating ?? null,
                    demographic: base.demographic ?? summary.demographic ?? null,
                    latestChapter: base.latestChapter ?? summary.latestChapter ?? null,
                    languages: base.languages.length ? base.languages : summary.languages,
                    tags: base.tags.length ? base.tags : summary.tags,
                    coverImage: base.coverImage ?? summary.coverImage ?? null,
                    url: base.url || summary.url,
                  };
                }
              } catch {
                // ignore hydration failures; proceed with provided data
              }
            }
            await prisma.readingListEntry.upsert({
              where: { userId_mangaId: { userId, mangaId } },
              create: {
                userId,
                mangaId,
                ...base,
                progress: (patch.progress ?? null) as string | null,
                rating:
                  typeof patch.rating === "number" && Number.isFinite(patch.rating)
                    ? patch.rating
                    : null,
                notes: (patch.notes ?? null) as string | null,
              },
              update: {},
            });
          } else {
            const summary = await getMangaSummaryById(mangaId);
            if (!summary) {
              skipped += 1;
              continue;
            }
            await prisma.readingListEntry.upsert({
              where: { userId_mangaId: { userId, mangaId: summary.id } },
              create: {
                userId,
                mangaId: summary.id,
                title: summary.title,
                altTitles: summary.altTitles,
                description: summary.description ?? null,
                status: summary.status ?? null,
                year: summary.year ?? null,
                contentRating: summary.contentRating ?? null,
                demographic: summary.demographic ?? null,
                latestChapter: summary.latestChapter ?? null,
                languages: summary.languages,
                tags: summary.tags,
                coverImage: summary.coverImage ?? null,
                url: summary.url,
                progress: (patch.progress ?? null) as string | null,
                rating:
                  typeof patch.rating === "number" && Number.isFinite(patch.rating)
                    ? patch.rating
                    : null,
                notes: (patch.notes ?? null) as string | null,
              },
              update: {},
            });
          }
          added += 1;
        } catch (error) {
          // Soft-skip on any failures (network, database, etc.)
          console.error(`[BulkImport] Error processing mangaId ${mangaId}:`, error);
          skipped += 1;
        }
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, Math.max(1, toCreate.length)) }).map(
      () => runWorker(),
    );
    await Promise.all(workers);

    return NextResponse.json({
      data: {
        added,
        updated,
        skipped,
      },
      message: "Bulk import complete.",
    });
  } catch (error) {
    console.error("Bulk reading list import failed", error);
    return NextResponse.json(
      { message: "Unable to process bulk import right now." },
      { status: 500 },
    );
  }
}


