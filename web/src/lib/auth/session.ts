import crypto from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "mynkdb_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
};

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function deleteSession(token: string) {
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);

  await prisma.session.deleteMany({
    where: {
      tokenHash,
    },
  });
}

export function buildSessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    },
  };
}

export function buildClearedSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    },
  };
}

export async function getSessionFromToken(token: string) {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!session?.user) {
    return null;
  }

  const { user } = session;

  return {
    session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    } satisfies AuthenticatedUser,
  };
}

export async function getCurrentUser() {
  const cookie = cookies().get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  const result = await getSessionFromToken(cookie.value);

  return result?.user ?? null;
}
