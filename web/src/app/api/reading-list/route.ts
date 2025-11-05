import { NextResponse } from "next/server";
import { z } from "zod";
import type { ReadingListEntry } from "@prisma/client";

import type { ReadingListItem } from "@/data/reading-list";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MangaDexAPIError, getMangaSummaryById } from "@/lib/mangadex/service";

const addToReadingListSchema = z
  .object({
    mangaId: z.string().min(1, "Manga identifier is required."),
    progress: z.string().optional(),
    rating: z
      .number()
      .min(0, "Rating cannot be negative.")
      .max(10, "Rating cannot exceed 10.")
      .optional(),
    notes: z.string().optional(),
  })
  .strict();

const removeFromReadingListSchema = z
  .object({
    mangaId: z.string().min(1, "Manga identifier is required."),
  })
  .strict();

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function serializeEntry(entry: ReadingListEntry): ReadingListItem {
  return {
    id: entry.id,
    mangaId: entry.mangaId,
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

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to view your reading list." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const take =
      parsedLimit !== undefined && Number.isInteger(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 100)
        : undefined;

    const entries = await prisma.readingListEntry.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      ...(take ? { take } : {}),
    });

    return NextResponse.json({
      data: entries.map(serializeEntry),
    });
  } catch (error) {
    console.error("Failed to load reading list", error);
    return NextResponse.json(
      { message: "Unable to load your reading list right now." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to modify your reading list." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request payload." },
        { status: 400 },
      );
    }

    const parsed = addToReadingListSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors: issues }, { status: 422 });
    }

    const { mangaId, progress, rating, notes } = parsed.data;

    try {
      const summary = await getMangaSummaryById(mangaId);

      if (!summary) {
        return NextResponse.json(
          { message: "Could not find that series on MangaDex." },
          { status: 404 },
        );
      }

      const progressValue = normalizeOptionalText(progress);
      const notesValue = normalizeOptionalText(notes);
      const ratingValue =
        typeof rating === "number" ? Number.parseFloat(rating.toFixed(2)) : null;

      const baseMetadata = {
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
      };

      const entry = await prisma.readingListEntry.upsert({
        where: {
          userId_mangaId: {
            userId: user.id,
            mangaId: summary.id,
          },
        },
        create: {
          userId: user.id,
          mangaId: summary.id,
          ...baseMetadata,
          progress: progressValue,
          rating: ratingValue,
          notes: notesValue,
        },
        update: {
          ...baseMetadata,
          ...(progress !== undefined ? { progress: progressValue } : {}),
          ...(rating !== undefined ? { rating: ratingValue } : {}),
          ...(notes !== undefined ? { notes: notesValue } : {}),
        },
      });

      return NextResponse.json(
        {
          data: serializeEntry(entry),
          message: "Saved to your reading list.",
        },
        { status: 200 },
      );
    } catch (error) {
      if (error instanceof MangaDexAPIError && error.status === 404) {
        return NextResponse.json(
          { message: "Could not find that series on MangaDex." },
          { status: 404 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Failed to update reading list", error);
    return NextResponse.json(
      { message: "Unable to update your reading list right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to modify your reading list." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request payload." },
        { status: 400 },
      );
    }

    const parsed = removeFromReadingListSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors: issues }, { status: 422 });
    }

    const { mangaId } = parsed.data;

    const result = await prisma.readingListEntry.deleteMany({
      where: {
        userId: user.id,
        mangaId,
      },
    });

    if (!result.count) {
      return NextResponse.json(
        { message: "That series is not in your reading list." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        data: { removed: result.count },
        message: "Removed from your reading list.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to remove from reading list", error);
    return NextResponse.json(
      { message: "Unable to update your reading list right now." },
      { status: 500 },
    );
  }
}
