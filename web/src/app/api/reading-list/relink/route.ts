import { NextResponse } from "next/server";
import { z } from "zod";
import type { ReadingListEntry } from "@prisma/client";

import type { ReadingListItem } from "@/data/reading-list";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMangaSummaryById, type Provider } from "@/lib/manga";

const relinkSchema = z
  .object({
    oldEntryId: z.string().min(1),
    newMangaId: z.string().min(1),
  })
  .strict();

function serializeEntry(entry: ReadingListEntry): ReadingListItem {
  return {
    id: entry.id,
    mangaId: entry.mangaId,
    provider: entry.provider as Provider,
    title: entry.title,
    altTitles: entry.altTitles,
    description: entry.description,
    status: entry.status,
    year: entry.year,
    contentRating: entry.contentRating,
    demographic: entry.demographic,
    latestChapter: entry.latestChapter,
    languages: entry.languages,
    tags: entry.tags,
    cover: entry.coverImage,
    url: entry.url,
    progress: entry.progress,
    rating: entry.rating,
    notes: entry.notes,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to relink entries." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = relinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { oldEntryId, newMangaId } = parsed.data;

    const oldEntry = await prisma.readingListEntry.findUnique({
      where: { id: oldEntryId },
    });
    if (!oldEntry || oldEntry.userId !== user.id) {
      return NextResponse.json(
        { message: "Old entry not found." },
        { status: 404 },
      );
    }
    if (oldEntry.provider !== "mangadex") {
      return NextResponse.json(
        { message: "Only legacy MangaDex entries can be relinked." },
        { status: 400 },
      );
    }

    const summary = await getMangaSummaryById(newMangaId, "mangaupdates");
    if (!summary) {
      return NextResponse.json(
        { message: "Couldn't find that MangaUpdates series." },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const upserted = await tx.readingListEntry.upsert({
        where: {
          userId_provider_mangaId: {
            userId: user.id,
            provider: "mangaupdates",
            mangaId: summary.id,
          },
        },
        create: {
          userId: user.id,
          provider: "mangaupdates",
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
          progress: oldEntry.progress,
          rating: oldEntry.rating,
          notes: oldEntry.notes,
          createdAt: oldEntry.createdAt,
        },
        update: {
          ...(oldEntry.progress ? { progress: oldEntry.progress } : {}),
          ...(oldEntry.rating !== null ? { rating: oldEntry.rating } : {}),
          ...(oldEntry.notes ? { notes: oldEntry.notes } : {}),
        },
      });

      await tx.readingListEntry.delete({
        where: { id: oldEntry.id },
      });

      return upserted;
    });

    return NextResponse.json({ data: serializeEntry(result) });
  } catch (error) {
    console.error("Failed to relink entry", error);
    return NextResponse.json(
      { message: "Unable to relink right now." },
      { status: 500 },
    );
  }
}
