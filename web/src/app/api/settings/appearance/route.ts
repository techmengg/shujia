import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { isSafeRequestOrigin } from "@/lib/security/origin";
import {
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  ThemeName,
  isThemeName,
} from "@/lib/theme/config";

const appearanceSchema = z.object({
  theme: z.enum(["dark", "light", "void"]),
});

export async function PATCH(request: Request) {
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

  const parsed = appearanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const requestedTheme = parsed.data.theme;
  const theme: ThemeName = isThemeName(requestedTheme)
    ? requestedTheme
    : THEME_DEFAULT;

  const response = NextResponse.json({
    data: { theme },
    message: "Appearance preferences updated.",
  });

  response.cookies.set(THEME_COOKIE_NAME, theme, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
