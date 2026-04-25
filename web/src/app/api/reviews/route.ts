import { NextResponse } from "next/server";
import { z } from "zod";
import type { Review } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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
}

type ReviewWithAuthor = Review & {
  author: {
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
};

function serialize(review: Review, author?: ReviewWithAuthor["author"]): SerializedReview {
  return {
    id: review.id,
    authorId: review.authorId,
    authorName: author?.name ?? null,
    authorUsername: author?.username ?? null,
    authorAvatar: author?.avatarUrl ?? null,
    provider: review.provider,
    mangaId: review.mangaId,
    rating: review.rating,
    body: review.body ?? null,
    hasSpoilers: review.hasSpoilers,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
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
        },
      }),
      prisma.review.count({ where: { provider, mangaId } }),
    ]);

    return NextResponse.json({
      data: reviews.map((r) => serialize(r, r.author)),
      total,
      limit: take,
      offset: skip,
    });
  } catch (error) {
    console.error("Failed to load reviews", error);
    return NextResponse.json(
      { message: "Unable to load reviews right now." },
      { status: 500 },
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

    const review = await prisma.review.upsert({
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
    });

    return NextResponse.json({ data: serialize(review) }, { status: 200 });
  } catch (error) {
    console.error("Failed to upsert review", error);
    return NextResponse.json(
      { message: "Unable to save your rating right now." },
      { status: 500 },
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

    const result = await prisma.review.deleteMany({
      where: {
        authorId: user.id,
        provider: parsed.data.provider,
        mangaId: parsed.data.mangaId,
      },
    });

    return NextResponse.json({ data: { removed: result.count } });
  } catch (error) {
    console.error("Failed to delete review", error);
    return NextResponse.json(
      { message: "Unable to remove your rating right now." },
      { status: 500 },
    );
  }
}
