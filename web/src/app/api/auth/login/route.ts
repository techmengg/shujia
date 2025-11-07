import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { isSafeRequestOrigin } from "@/lib/security/origin";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookie,
  createSession,
  deleteSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  consumeRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/two-factor";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
  totp: z.string().optional(),
  recoveryCode: z.string().optional(),
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
      type: "login",
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
    type: "login",
    identifier: candidateEmail,
  });

  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { email, password, totp, recoveryCode } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (user.twoFactorEnabled) {
      const hasSecret = Boolean(user.twoFactorSecret);

      if (!hasSecret) {
        console.warn(`User ${user.id} has 2FA enabled without a secret.`);
      }

      const normalizedTotp = typeof totp === "string" ? totp.trim() : "";
      const normalizedRecovery =
        typeof recoveryCode === "string" ? recoveryCode.trim() : "";

      if (hasSecret && !normalizedTotp && !normalizedRecovery) {
        return NextResponse.json(
          {
            message: "Enter the 6-digit code from your authenticator.",
            requiresTwoFactor: true,
          },
          { status: 401 },
        );
      }

      let verified = false;

      if (hasSecret && normalizedTotp) {
        verified = verifyTotpCode(user.twoFactorSecret!, normalizedTotp);
      }

      if (!verified && normalizedRecovery) {
        const { matched, remaining } = consumeRecoveryCode(
          user.twoFactorRecoveryCodes ?? [],
          normalizedRecovery,
        );

        if (matched) {
          verified = true;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorRecoveryCodes: remaining,
            },
          });
        }
      }

      if (!verified) {
        return NextResponse.json(
          {
            message: normalizedTotp
              ? "Invalid authentication code."
              : "Invalid recovery code.",
            requiresTwoFactor: true,
          },
          { status: 401 },
        );
      }
    }

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (existingCookie?.value) {
      await deleteSession(existingCookie.value);
    }

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
      { status: 200 },
    );

    const cookie = buildSessionCookie(session.token, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      { message: "Unable to sign in right now." },
      { status: 500 },
    );
  }
}
