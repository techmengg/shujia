import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { isSafeRequestOrigin } from "@/lib/security/origin";
import { consumeRegistrationVerificationToken } from "@/lib/auth/registration-verification";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookie,
  createSession,
} from "@/lib/auth/session";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
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
      type: "verifyEmail",
    });

    if (!rateLimit.ok) {
      return rateLimit.response;
    }

    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const candidateToken =
    body &&
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as Record<string, unknown>).token === "string"
      ? (body as Record<string, string>).token
      : undefined;

  const rateLimit = await enforceRateLimit({
    request,
    type: "verifyEmail",
    identifier: candidateToken,
  });

  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { token } = parsed.data;

    const pending = await consumeRegistrationVerificationToken(token);

    if (!pending) {
      return NextResponse.json(
        { message: "Verification link is invalid or has expired." },
        { status: 400 },
      );
    }

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({
        where: { email: pending.email },
      }),
      prisma.user.findUnique({
        where: { username: pending.username },
      }),
    ]);

    if (existingEmail || existingUsername) {
      return NextResponse.json(
        {
          message:
            "That email or username is no longer available. Please restart registration with different details.",
        },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: pending.email,
        username: pending.username,
        name: pending.name,
        password: pending.passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    const session = await createSession(user.id);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? null,
        },
      },
      { status: 200 },
    );

    const cookie = buildSessionCookie(session.token, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    console.error("Verify email error", error);
    return NextResponse.json(
      { message: "Unable to verify email right now." },
      { status: 500 },
    );
  }
}
