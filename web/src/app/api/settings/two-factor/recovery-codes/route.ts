import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateRecoveryCodes,
  verifyTotpCode,
} from "@/lib/auth/two-factor";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const regenerateSchema = z.object({
  code: z.string().min(1, "Authenticator code is required"),
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

  const parsed = regenerateSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { code } = parsed.data;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json(
        { message: "Enable two-factor authentication first." },
        { status: 400 },
      );
    }

    const valid = verifyTotpCode(dbUser.twoFactorSecret, code);

    if (!valid) {
      return NextResponse.json(
        { message: "That authentication code is incorrect." },
        { status: 400 },
      );
    }

    const { codes, hashed } = generateRecoveryCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorRecoveryCodes: hashed,
      },
    });

    return NextResponse.json({
      message: "Generated new recovery codes.",
      recoveryCodes: codes,
    });
  } catch (error) {
    console.error("2FA recovery regenerate error", error);
    return NextResponse.json(
      { message: "Unable to generate new recovery codes right now." },
      { status: 500 },
    );
  }
}
