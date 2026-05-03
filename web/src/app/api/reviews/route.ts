import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Review } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// GET serves the reviews feed for a single series and must reflect writes
// from POST/DELETE immediately - no static optimization, no CDN cache.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

const upsertSchema = z
  .object({
    mangaId: z.string().min(1),
    provider: z.enum(["mangadex", "mangaupdates"]),
    rating: z.number().int().min(1).max(10),
    body: z.string().max(10_000).optional(),
    hasSpoilers: z.boolean().optional(),
  })
  .strict();

const deleteSchema = z
  .object({
    mangaId: z.string().min(1),
    provider: z.enum(["mangadex", "mangaupdates"]),
  })
  .strict();

interface ReactionCounts {
  thumbs_up: number;
  thumbs_down: number;
  funny: number;
  confusing: number;
  heart: number;
  angry: number;
}

interface SerializedReview {
  id: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  provider: string;
  mangaId: string;
  rating: number;
  body: string | null;
  hasSpoilers: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: ReactionCounts;
  userReactions: string[];
}

type ReviewWithRelations = Review & {
  author: {
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  reactions: { type: string; userId: string }[];
};

function serialize(
  review: ReviewWithRelations,
  viewerId?: string | null,
): SerializedReview {
  const counts: ReactionCounts = {
    thumbs_up: 0,
    thumbs_down: 0,
    funny: 0,
    confusing: 0,
    heart: 0,
    angry: 0,
  };

  const userReactions: string[] = [];

  for (const reaction of review.reactions) {
    if (reaction.type in counts) {
      counts[reaction.type as keyof ReactionCounts] += 1;
    }
    if (viewerId && reaction.userId === viewerId) {
      userReactions.push(reaction.type);
    }
  }

  return {
    id: review.id,
    authorId: review.authorId,
    authorName: review.author?.name ?? null,
    authorUsername: review.author?.username ?? null,
    authorAvatar: review.author?.avatarUrl ?? null,
    provider: review.provider,
    mangaId: review.mangaId,
    rating: review.rating,
    body: review.body ?? null,
    hasSpoilers: review.hasSpoilers,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    reactions: counts,
    userReactions,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");
    const mangaId = url.searchParams.get("mangaId");

    if (!provider || !mangaId) {
      return NextResponse.json(
        { message: "Missing provider or mangaId." },
        { status: 400 },
      );
    }

    if (provider !== "mangadex" && provider !== "mangaupdates") {
      return NextResponse.json(
        { message: "Unknown provider." },
        { status: 400 },
      );
    }

    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const parsedOffset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined;
    const take = Math.min(
      Math.max(
        parsedLimit !== undefined && Number.isInteger(parsedLimit) ? parsedLimit : 20,
        1,
      ),
      50,
    );
    const skip =
      parsedOffset !== undefined && Number.isInteger(parsedOffset)
        ? Math.max(parsedOffset, 0)
        : 0;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { provider, mangaId },
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          author: {
            select: { name: true, username: true, avatarUrl: true },
          },
          reactions: {
            select: { type: true, userId: true },
          },
        },
      }),
      prisma.review.count({ where: { provider, mangaId } }),
    ]);

    return NextResponse.json(
      {
        data: reviews.map((r) => serialize(r)),
        total,
        limit: take,
        offset: skip,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Failed to load reviews", error);
    return NextResponse.json(
      { message: "Unable to load reviews right now." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to rate or review." },
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

    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { mangaId, provider, rating, body: reviewBody, hasSpoilers } = parsed.data;
    const trimmedBody = typeof reviewBody === "string" ? reviewBody.trim() : "";
    const bodyValue = trimmedBody.length > 0 ? trimmedBody : null;

    const [review] = await prisma.$transaction([
      prisma.review.upsert({
        where: {
          authorId_provider_mangaId: {
            authorId: user.id,
            provider,
            mangaId,
          },
        },
        create: {
          authorId: user.id,
          provider,
          mangaId,
          rating,
          body: bodyValue,
          hasSpoilers: hasSpoilers ?? false,
        },
        update: {
          rating,
          body: bodyValue,
          ...(hasSpoilers !== undefined ? { hasSpoilers } : {}),
        },
        include: {
          author: { select: { name: true, username: true, avatarUrl: true } },
          reactions: { select: { type: true, userId: true } },
        },
      }),
      // Sync rating to the user's reading list entry
      prisma.readingListEntry.updateMany({
        where: { userId: user.id, provider, mangaId },
        data: { rating },
      }),
    ]);

    // Bust the right-sidebar's recent-reviews unstable_cache so the new/
    // edited review surfaces sitewide on the next render instead of
    // waiting up to 60s for natural revalidation.
    revalidateTag("sidebar-recent-reviews");

    return NextResponse.json(
      { data: serialize(review, user.id) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Failed to upsert review", error);
    return NextResponse.json(
      { message: "Unable to save your rating right now." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in." },
        { status: 401 },
      );
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      // empty body OK
    }

    const parsed = deleteSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const [result] = await prisma.$transaction([
      prisma.review.deleteMany({
        where: {
          authorId: user.id,
          provider: parsed.data.provider,
          mangaId: parsed.data.mangaId,
        },
      }),
      // Clear rating from reading list entry
      prisma.readingListEntry.updateMany({
        where: { userId: user.id, provider: parsed.data.provider, mangaId: parsed.data.mangaId },
        data: { rating: null },
      }),
    ]);

    revalidateTag("sidebar-recent-reviews");

    return NextResponse.json(
      { data: { removed: result.count } },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Failed to delete review", error);
    return NextResponse.json(
      { message: "Unable to remove your rating right now." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
