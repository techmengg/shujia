import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120, "Name must be 120 characters or fewer")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must be 500 characters or fewer")
    .optional(),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(100, "Timezone must be 100 characters or fewer"),
  avatarUrl: z
    .string()
    .trim()
    .url("Enter a valid image URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

function toNullable(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function PATCH(request: Request) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "You must be signed in." },
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

  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { name, bio, timezone, avatarUrl } = parsed.data;

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: toNullable(name),
        bio: toNullable(bio),
        timezone,
        avatarUrl: toNullable(avatarUrl),
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        timezone: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      data: updated,
      message: "Profile updated.",
    });
  } catch (error) {
    console.error("Profile update error", error);
    return NextResponse.json(
      { message: "Unable to update your profile right now." },
      { status: 500 },
    );
  }
}
