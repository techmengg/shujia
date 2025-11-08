import { Buffer } from "node:buffer";

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

type GoogleOAuthContext = "login" | "register";

interface StatePayload {
  state: string;
  context: GoogleOAuthContext;
  redirect?: string | null;
}

function sanitizeRedirectPath(value: string | null) {
  if (!value) {
    return null;
  }
  if (!value.startsWith("/")) {
    return null;
  }
  try {
    // Reject protocol-relative URLs
    const url = new URL(`http://placeholder${value}`);
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

function encodeStateParam(payload: StatePayload) {
  return Buffer.from(
    JSON.stringify({
      token: payload.state,
      context: payload.context,
      redirect: payload.redirect ?? undefined,
    }),
  ).toString("base64url");
}

function encodeStateCookie(payload: StatePayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function buildFailureRedirect(
  baseUrl: string,
  context: GoogleOAuthContext,
  errorCode: string,
) {
  const path = context === "login" ? "/login" : "/register";
  const separator = path.includes("?") ? "&" : "?";
  return `${baseUrl}${path}${separator}error=${errorCode}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contextParam = url.searchParams.get("context");
  const context: GoogleOAuthContext =
    contextParam === "login" ? "login" : "register";
  const redirectParam = sanitizeRedirectPath(url.searchParams.get("redirect"));
  const baseUrl = buildAppBaseUrl(request);

  if (!isGoogleOAuthConfigured()) {
    const fallback = buildFailureRedirect(
      baseUrl,
      context,
      "google-oauth-disabled",
    );
    return NextResponse.redirect(fallback);
  }

  const redirectUri = getGoogleRedirectUri(request);
  const stateToken = generateStateToken();
  const statePayload: StatePayload = {
    state: stateToken,
    context,
    redirect: redirectParam,
  };
  const stateParam = encodeStateParam(statePayload);
  const authorizationUrl = buildGoogleAuthorizationUrl(stateParam, redirectUri);

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set({
    name: getStateCookieName(),
    value: encodeStateCookie(statePayload),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
