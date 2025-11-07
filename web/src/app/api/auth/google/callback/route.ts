import crypto from "node:crypto";
import bcrypt from "bcryptjs";
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

export async function GET(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    const destination = `${buildAppBaseUrl(request)}/register?error=google-oauth-disabled`;
    return NextResponse.redirect(destination);
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const cookieStore = cookies();
  const storedState = cookieStore.get(getStateCookieName())?.value;
  cookieStore.delete(getStateCookieName());

  if (error || !state || !code || !storedState || state !== storedState) {
    const destination = `${buildAppBaseUrl(request)}/register?error=google-oauth-failed`;
    return NextResponse.redirect(destination);
  }

  try {
    const redirectUri = getGoogleRedirectUri(request);
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!profile.email || profile.email_verified === false) {
      const destination = `${buildAppBaseUrl(request)}/register?error=google-email-unverified`;
      return NextResponse.redirect(destination);
    }

    const googleId = profile.sub;
    if (!googleId) {
      const destination = `${buildAppBaseUrl(request)}/register?error=google-profile-missing`;
      return NextResponse.redirect(destination);
    }

    const normalizedEmail = profile.email.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      user = await prisma.user.findUnique({
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
    const base = buildAppBaseUrl(request);
    const destination = user.username
      ? `${base}/profile/${user.username}`
      : `${base}/settings?onboarding=complete-profile`;

    const response = NextResponse.redirect(destination);
    const cookie = buildSessionCookie(session.token, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (callbackError) {
    console.error("Google OAuth callback failed", callbackError);
    const destination = `${buildAppBaseUrl(request)}/register?error=google-oauth-failed`;
    return NextResponse.redirect(destination);
  }
}
