import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeRecoveryCode, verifyTotpCode } from "@/lib/auth/two-factor";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const disableSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    code: z.string().optional(),
    recoveryCode: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.code?.trim() || value.recoveryCode?.trim()),
    {
      message: "Provide either an authenticator code or a recovery code.",
      path: ["code"],
    },
  );

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

  const parsed = disableSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { currentPassword, code, recoveryCode } = parsed.data;

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

    if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json(
        { message: "Two-factor authentication is not enabled." },
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

    let verified = false;

    if (code?.trim()) {
      verified = verifyTotpCode(dbUser.twoFactorSecret, code);
    }

    if (!verified && recoveryCode?.trim()) {
      const { matched } = consumeRecoveryCode(
        dbUser.twoFactorRecoveryCodes ?? [],
        recoveryCode,
      );
      verified = matched;
    }

    if (!verified) {
      return NextResponse.json(
        { message: "Invalid authenticator or recovery code." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null,
        twoFactorRecoveryCodes: [],
      },
    });

    return NextResponse.json({
      message: "Two-factor authentication has been disabled.",
    });
  } catch (error) {
    console.error("2FA disable error", error);
    return NextResponse.json(
      { message: "Unable to disable two-factor right now." },
      { status: 500 },
    );
  }
}
