import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookie,
  createSession,
} from "@/lib/auth/session";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password must be at most 72 characters long"),
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
      type: "resetPassword",
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
    type: "resetPassword",
    identifier: candidateToken,
  });

  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { token, password } = parsed.data;

    const userId = await consumePasswordResetToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: "Reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    await prisma.session.deleteMany({
      where: { userId },
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
    console.error("Reset password error", error);
    return NextResponse.json(
      { message: "Unable to reset password right now." },
      { status: 500 },
    );
  }
}
