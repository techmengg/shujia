import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  getCurrentUser,
  hashToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

export async function DELETE(request: Request) {
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

  const cookie = cookies().get(SESSION_COOKIE_NAME);
  const currentTokenHash = cookie?.value ? hashToken(cookie.value) : null;

  try {
    const result = await prisma.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentTokenHash
          ? {
              tokenHash: {
                not: currentTokenHash,
              },
            }
          : {}),
      },
    });

    return NextResponse.json({
      message:
        result.count > 0
          ? "Signed out other sessions."
          : "No other sessions to sign out.",
      data: {
        revoked: result.count,
      },
    });
  } catch (error) {
    console.error("Session revocation error", error);
    return NextResponse.json(
      { message: "Unable to manage sessions right now." },
      { status: 500 },
    );
  }
}
