import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { generateTwoFactorSecret } from "@/lib/auth/two-factor";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

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

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        twoFactorEnabled: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 },
      );
    }

    if (dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { message: "Two-factor authentication is already enabled." },
        { status: 400 },
      );
    }

    const { secret, otpauthUrl } = generateTwoFactorSecret(dbUser.email);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempSecret: secret,
      },
    });

    return NextResponse.json({
      secret,
      otpauthUrl,
    });
  } catch (error) {
    console.error("2FA setup error", error);
    return NextResponse.json(
      { message: "Unable to start two-factor setup right now." },
      { status: 500 },
    );
  }
}
