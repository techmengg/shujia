import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { AuthAttemptType, AuthThrottleScope } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const CLEANUP_WINDOW_MS = 1000 * 60 * 60 * 24; // 24 hours
const CLEANUP_SAMPLING_RATE = 0.05;

type RateLimitCategory = "login" | "register" | "forgotPassword" | "resetPassword";

type Threshold = {
  max: number;
  windowMs: number;
  message: string;
};

type RateLimitPolicy = {
  attemptType: AuthAttemptType;
  ip?: Threshold;
  identifier?: Threshold;
};

const RATE_LIMIT_POLICIES: Record<RateLimitCategory, RateLimitPolicy> = {
  login: {
    attemptType: AuthAttemptType.LOGIN,
    ip: {
      max: 10,
      windowMs: 60_000,
      message: "Too many sign-in attempts from this network. Please wait a minute.",
    },
    identifier: {
      max: 5,
      windowMs: 60_000,
      message: "Too many sign-in attempts for this account. Please wait a minute.",
    },
  },
  register: {
    attemptType: AuthAttemptType.REGISTER,
    ip: {
      max: 5,
      windowMs: 10 * 60_000,
      message: "Too many sign-up attempts from this network. Please try again later.",
    },
    identifier: {
      max: 2,
      windowMs: 60 * 60_000,
      message: "Too many sign-up attempts for this email. Please try again later.",
    },
  },
  forgotPassword: {
    attemptType: AuthAttemptType.FORGOT_PASSWORD,
    ip: {
      max: 5,
      windowMs: 10 * 60_000,
      message: "Too many reset requests from this network. Please wait a while and try again.",
    },
    identifier: {
      max: 3,
      windowMs: 60 * 60_000,
      message: "Too many reset requests for this account. Please wait before trying again.",
    },
  },
  resetPassword: {
    attemptType: AuthAttemptType.RESET_PASSWORD,
    ip: {
      max: 10,
      windowMs: 10 * 60_000,
      message: "Too many password reset submissions. Please wait a while and try again.",
    },
  },
};

type EnforceRateLimitArgs = {
  request: Request;
  type: RateLimitCategory;
  identifier?: string | null;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const candidate = forwarded.split(",")[0]?.trim();
    if (candidate) {
      return candidate;
    }
  }

  const realIp = request.headers.get("x-real-ip") || request.headers.get("x-client-ip");
  if (realIp) {
    return realIp;
  }

  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) {
    return cloudflareIp;
  }

  return null;
}

export async function enforceRateLimit({
  request,
  type,
  identifier,
}: EnforceRateLimitArgs): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[type];
  const ip = getClientIp(request);
  const normalizedIdentifier =
    identifier?.trim().toLowerCase() || undefined;

  const createData: Array<{
    type: AuthAttemptType;
    scope: AuthThrottleScope;
    hash: string;
  }> = [];

  const now = Date.now();

  if (ip && policy.ip) {
    const ipHash = hashValue(ip);
    const ipWindowStart = new Date(now - policy.ip.windowMs);
    const ipCount = await prisma.authAttempt.count({
      where: {
        type: policy.attemptType,
        scope: AuthThrottleScope.IP,
        hash: ipHash,
        createdAt: {
          gte: ipWindowStart,
        },
      },
    });

    if (ipCount >= policy.ip.max) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: policy.ip.message },
          { status: 429 },
        ),
      };
    }

    createData.push({
      type: policy.attemptType,
      scope: AuthThrottleScope.IP,
      hash: ipHash,
    });
  }

  if (normalizedIdentifier && policy.identifier) {
    const identifierHash = hashValue(normalizedIdentifier);
    const identifierWindowStart = new Date(now - policy.identifier.windowMs);
    const identifierCount = await prisma.authAttempt.count({
      where: {
        type: policy.attemptType,
        scope: AuthThrottleScope.IDENTIFIER,
        hash: identifierHash,
        createdAt: {
          gte: identifierWindowStart,
        },
      },
    });

    if (identifierCount >= policy.identifier.max) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: policy.identifier.message },
          { status: 429 },
        ),
      };
    }

    createData.push({
      type: policy.attemptType,
      scope: AuthThrottleScope.IDENTIFIER,
      hash: identifierHash,
    });
  }

  if (createData.length > 0) {
    await prisma.authAttempt.createMany({
      data: createData,
    });
  }

  if (Math.random() < CLEANUP_SAMPLING_RATE) {
    const cutoff = new Date(Date.now() - CLEANUP_WINDOW_MS);
    void prisma.authAttempt
      .deleteMany({
        where: {
          createdAt: {
            lt: cutoff,
          },
        },
      })
      .catch((error) => {
        console.error("Auth attempt cleanup failed", error);
      });
  }

  return { ok: true };
}
