import crypto from "node:crypto";
import type { Session, User } from "@prisma/client";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getCachedSession, setCachedSession, invalidateCachedSession } from "./session-cache";

export const SESSION_COOKIE_NAME = "mynkdb_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
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

  // Invalidate cache
  invalidateCachedSession(tokenHash);

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

// Helper to add timeout to database queries
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Database query timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export async function getSessionFromToken(token: string) {
  if (!token) {
    return null;
  }

	const tokenHash = hashToken(token);

	// Check in-memory cache first
	const cachedUser = getCachedSession(tokenHash);
	if (cachedUser) {
		return {
			session: null, // We don't cache the full session object
			user: cachedUser,
		};
	}

	let session: (Session & { user: User | null }) | null = null;
	try {
		// Add 3-second timeout to prevent hanging on slow database connections
		session = await withTimeout(
			prisma.session.findFirst({
				where: {
					tokenHash,
					expiresAt: {
						gt: new Date(),
					},
				},
				include: {
					user: true,
				},
			}),
			3000,
			null
		);
	} catch (error) {
		// Gracefully degrade if the database is temporarily unavailable in production
		console.warn("getSessionFromToken: database unavailable, treating as no session", error);
		return null;
	}

  if (!session?.user) {
    return null;
  }

  const { user } = session;

  const username =
    (user as { username?: string | null }).username ?? null;

  const authenticatedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    username,
  } satisfies AuthenticatedUser;

	// Cache the user for subsequent requests
	setCachedSession(tokenHash, authenticatedUser);

  return {
    session,
    user: authenticatedUser,
  };
}

export async function getCurrentUser() {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE_NAME);

	if (!cookie?.value) {
		return null;
	}

	try {
		const result = await getSessionFromToken(cookie.value);

		return result?.user ?? null;
	} catch (error) {
		// Extra safety net: never let session lookup crash SSR
		console.warn("getCurrentUser: failed to resolve session, continuing unauthenticated", error);
		return null;
	}
}
