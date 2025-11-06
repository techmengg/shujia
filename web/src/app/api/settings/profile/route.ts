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
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(32, "Username must be at most 32 characters long")
    .regex(/^[a-zA-Z0-9_]+$/, "Usernames can only include letters, numbers, and underscores.")
    .transform((value) => value.toLowerCase()),
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
    .refine(
      (value) =>
        value.length === 0 ||
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("/uploads/"),
      { message: "Enter a valid image URL" },
    )
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
});

function containsProhibitedWords(value?: string | null): boolean {
  if (!value) return false;
  const text = value.toLowerCase();
  const banned = [
    "fuck","shit","bitch","asshole","bastard","cunt","dick","pussy","whore","slut",
    "rape","rapist","kill","murder","suicide",
    "nigger","nigga","chink","gook","spic","wetback","faggot","tranny","retard","retarded",
    "kkk","heil","hitler",
  ];
  return banned.some((w) => text.includes(w));
}

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

  const { name, username, bio, timezone, avatarUrl } = parsed.data;

  if (containsProhibitedWords(username) || containsProhibitedWords(name ?? null)) {
    const errors: Record<string, string[]> = {};
    if (containsProhibitedWords(username)) {
      errors.username = ["Choose a different username without offensive words."];
    }
    if (name && containsProhibitedWords(name)) {
      errors.name = ["Choose a different name without offensive words."];
    }
    return NextResponse.json({ errors }, { status: 422 });
  }

  const usernameOwner = await prisma.user.findFirst({
    where: {
      username,
      NOT: {
        id: user.id,
      },
    },
    select: { id: true },
  });

  if (usernameOwner) {
    return NextResponse.json(
      { message: "That username is already taken." },
      { status: 409 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: toNullable(name),
        username,
        bio: toNullable(bio),
        timezone,
        avatarUrl: toNullable(avatarUrl),
      },
      select: {
        id: true,
        email: true,
        username: true,
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
