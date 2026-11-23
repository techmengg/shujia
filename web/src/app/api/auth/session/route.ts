import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

// Per-visitor answer: never let a shared cache keep it.
const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200, headers: NO_STORE });
    }

    // Public profile fields only: the email stays on the server, and the
    // no-store header keeps one visitor's answer out of shared caches.
    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("Session lookup error", error);
    return NextResponse.json(
      { message: "Unable to verify session right now." },
      { status: 500, headers: NO_STORE },
    );
  }
}
