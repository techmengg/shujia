import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildClearedSessionCookie,
  deleteSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { isSafeRequestOrigin } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  try {
    const cookieStore = cookies();
    const existingCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (existingCookie?.value) {
      await deleteSession(existingCookie.value);
    }

    const response = NextResponse.json({ success: true });
    const clearedCookie = buildClearedSessionCookie();

    response.cookies.set(
      clearedCookie.name,
      clearedCookie.value,
      clearedCookie.options,
    );

    return response;
  } catch (error) {
    console.error("Logout error", error);
    return NextResponse.json(
      { message: "Unable to sign out right now." },
      { status: 500 },
    );
  }
}
