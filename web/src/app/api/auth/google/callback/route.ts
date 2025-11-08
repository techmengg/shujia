import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Buffer } from "node:buffer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleRedirectUri,
  getStateCookieName,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-oauth";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookie,
  createSession,
} from "@/lib/auth/session";

function buildAppBaseUrl(request: Request) {
  return (
    process.env.APP_BASE_URL?.replace(/\/+$/, "") ||
    new URL(request.url).origin
  );
}

async function createRandomPasswordHash() {
  const randomSecret = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(randomSecret, 12);
}

type GoogleOAuthContext = "login" | "register";

interface StatePayload {
  token: string;
  context: GoogleOAuthContext;
  redirect?: string | null;
}

interface StateCookiePayload {
  state: string;
  context: GoogleOAuthContext;
  redirect?: string | null;
}

function sanitizeRedirectPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (!value.startsWith("/")) {
    return null;
  }
  try {
    const url = new URL(`http://placeholder${value}`);
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

function decodeStateParam(value: string | null): StatePayload | null {
  if (!value) {
    return null;
  }
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded) as Partial<StatePayload>;
    if (!parsed || typeof parsed.token !== "string") {
      return null;
    }

    return {
      token: parsed.token,
      context: parsed.context === "login" ? "login" : "register",
      redirect: sanitizeRedirectPath(parsed.redirect),
    };
  } catch {
    return null;
  }
}

function decodeStateCookie(value: string | undefined): StateCookiePayload | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded) as Partial<StateCookiePayload>;
    if (!parsed || typeof parsed.state !== "string") {
      return null;
    }

    return {
      state: parsed.state,
      context: parsed.context === "login" ? "login" : "register",
      redirect: sanitizeRedirectPath(parsed.redirect),
    };
  } catch {
    // Fallback for legacy state cookie values that only stored the random token
    return {
      state: value,
      context: "register",
      redirect: null,
    };
  }
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

function resolveSuccessDestination(
  baseUrl: string,
  redirectPath: string | null,
  user: { username: string | null },
) {
  if (redirectPath) {
    if (redirectPath.startsWith("/profile")) {
      if (!user.username) {
        return `${baseUrl}/settings?onboarding=complete-profile`;
      }
      if (redirectPath === "/profile") {
        return `${baseUrl}/profile/${user.username}`;
      }
      return `${baseUrl}/profile/${user.username}${redirectPath.slice("/profile".length)}`;
    }
    return `${baseUrl}${redirectPath}`;
  }

  if (user.username) {
    return `${baseUrl}/profile/${user.username}`;
  }
  return `${baseUrl}/settings?onboarding=complete-profile`;
}

export async function GET(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    const destination = buildFailureRedirect(
      buildAppBaseUrl(request),
      "register",
      "google-oauth-disabled",
    );
    return NextResponse.redirect(destination);
  }

  const url = new URL(request.url);
  const stateParam = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const statePayload = decodeStateParam(stateParam);

  const cookieStore = await cookies();
  const storedStatePayload = decodeStateCookie(
    cookieStore.get(getStateCookieName())?.value,
  );
  cookieStore.delete(getStateCookieName());

  const baseUrl = buildAppBaseUrl(request);
  const context = statePayload?.context ?? storedStatePayload?.context ?? "register";
  const redirectPath =
    statePayload?.redirect ??
    storedStatePayload?.redirect ??
    null;
  const storedState = storedStatePayload?.state;
  const providedState = statePayload?.token;

  if (
    error ||
    !code ||
    !storedState ||
    !providedState ||
    providedState !== storedState
  ) {
    const destination = buildFailureRedirect(
      baseUrl,
      context,
      "google-oauth-failed",
    );
    return NextResponse.redirect(destination);
  }

  try {
    const redirectUri = getGoogleRedirectUri(request);
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!profile.email || profile.email_verified === false) {
      const destination = buildFailureRedirect(
        baseUrl,
        context,
        "google-email-unverified",
      );
      return NextResponse.redirect(destination);
    }

    const googleId = profile.sub;
    if (!googleId) {
    const destination = buildFailureRedirect(
      baseUrl,
      context,
      "google-profile-missing",
    );
      return NextResponse.redirect(destination);
    }

    const normalizedEmail = profile.email.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          avatarUrl: profile.picture ?? user.avatarUrl,
          name: profile.name?.slice(0, 100) ?? user.name,
        },
      });
    }

    if (!user) {
      const passwordHash = await createRandomPasswordHash();
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          googleId,
          name: profile.name?.slice(0, 100) ?? null,
          avatarUrl: profile.picture ?? null,
          password: passwordHash,
        },
      });
    }

    const session = await createSession(user.id);
    const destination = resolveSuccessDestination(
      baseUrl,
      redirectPath,
      { username: (user as { username?: string | null }).username ?? null },
    );

    const response = NextResponse.redirect(destination);
    const cookie = buildSessionCookie(session.token, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (callbackError) {
    console.error("Google OAuth callback failed", callbackError);
    const destination = buildFailureRedirect(
      baseUrl,
      context,
      "google-oauth-failed",
    );
    return NextResponse.redirect(destination);
  }
}
