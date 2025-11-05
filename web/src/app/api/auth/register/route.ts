import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { isSafeRequestOrigin } from "@/lib/security/origin";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookie,
  createSession,
} from "@/lib/auth/session";

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password must be at most 72 characters long"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(32, "Username must be at most 32 characters long")
    .regex(/^[a-zA-Z0-9_]+$/, "Usernames can only include letters, numbers, and underscores.")
    .transform((value) => value.toLowerCase()),
  name: z
    .string()
    .trim()
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
});

export async function POST(request: Request) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const rateLimit = await enforceRateLimit({
      request,
      type: "register",
    });

    if (!rateLimit.ok) {
      return rateLimit.response;
    }

    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const candidateEmail =
    body &&
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as Record<string, unknown>).email === "string"
      ? (body as Record<string, string>).email
      : undefined;

  const rateLimit = await enforceRateLimit({
    request,
    type: "register",
    identifier: candidateEmail,
  });

  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { email, password, name, username } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { message: "That username is already taken." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        name: name ?? null,
        password: passwordHash,
      },
    });

    const session = await createSession(user.id);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: (user as { username?: string | null }).username ?? null,
        },
      },
      { status: 201 },
    );

    const cookie = buildSessionCookie(session.token, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    console.error("Registration error", error);
    return NextResponse.json(
      { message: "Unable to create account right now." },
      { status: 500 },
    );
  }
}
