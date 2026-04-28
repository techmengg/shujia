import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const REACTION_TYPES = [
  "thumbs_up",
  "thumbs_down",
  "funny",
  "confusing",
  "heart",
  "angry",
] as const;

const toggleSchema = z
  .object({
    reviewId: z.string().min(1),
    type: z.enum(REACTION_TYPES),
  })
  .strict();

/** Toggle a reaction: if it exists, remove it; if not, add it. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to react." },
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

    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { reviewId, type } = parsed.data;

    // Verify the review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) {
      return NextResponse.json(
        { message: "Review not found." },
        { status: 404 },
      );
    }

    // Toggle: delete if exists, create if not
    const existing = await prisma.reviewReaction.findUnique({
      where: {
        reviewId_userId_type: {
          reviewId,
          userId: user.id,
          type,
        },
      },
    });

    if (existing) {
      await prisma.reviewReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ data: { action: "removed", type } });
    }

    await prisma.reviewReaction.create({
      data: { reviewId, userId: user.id, type },
    });

    return NextResponse.json({ data: { action: "added", type } });
  } catch (error) {
    console.error("Failed to toggle reaction", error);
    return NextResponse.json(
      { message: "Unable to save your reaction right now." },
      { status: 500 },
    );
  }
}
