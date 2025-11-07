import { NextResponse } from "next/server";

import {
  buildGoogleAuthorizationUrl,
  generateStateToken,
  getGoogleRedirectUri,
  getStateCookieName,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-oauth";

function buildAppBaseUrl(request: Request) {
  return (
    process.env.APP_BASE_URL?.replace(/\/+$/, "") ||
    new URL(request.url).origin
  );
}

export async function GET(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    const fallback = `${buildAppBaseUrl(request)}/register?error=google-oauth-disabled`;
    return NextResponse.redirect(fallback);
  }

  const redirectUri = getGoogleRedirectUri(request);
  const state = generateStateToken();
  const authorizationUrl = buildGoogleAuthorizationUrl(state, redirectUri);

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set({
    name: getStateCookieName(),
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
