import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  generateRecoveryCodes,
  verifyTotpCode,
} from "@/lib/auth/two-factor";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const verifySchema = z.object({
  code: z.string().min(1, "Enter the 6-digit code from your authenticator."),
  currentPassword: z.string().min(1, "Current password is required"),
});

export async function POST(request: Request) {
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

  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { code, currentPassword } = parsed.data;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 },
      );
    }

    if (!dbUser.twoFactorTempSecret) {
      return NextResponse.json(
        { message: "Start setup before verifying your code." },
        { status: 400 },
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      dbUser.password,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Current password is incorrect." },
        { status: 401 },
      );
    }

    const codeValid = verifyTotpCode(dbUser.twoFactorTempSecret, code);

    if (!codeValid) {
      return NextResponse.json(
        { message: "That code doesn’t look right. Try a new one." },
        { status: 400 },
      );
    }

    const { codes, hashed } = generateRecoveryCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: dbUser.twoFactorTempSecret,
        twoFactorTempSecret: null,
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: hashed,
      },
    });

    return NextResponse.json({
      message: "Two-factor authentication is enabled.",
      recoveryCodes: codes,
    });
  } catch (error) {
    console.error("2FA verify error", error);
    return NextResponse.json(
      { message: "Unable to verify your code right now." },
      { status: 500 },
    );
  }
}
