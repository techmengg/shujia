import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildClearedSessionCookie,
  deleteSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function POST() {
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
