import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { isSafeRequestOrigin } from "@/lib/security/origin";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email/transport";
import { createRegistrationVerification } from "@/lib/auth/registration-verification";
import { dispatchEmailVerificationEmail } from "@/lib/email/verify-email";

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password must be at most 72 characters long"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(32, "Username must be at most 32 characters long")
    .regex(/^[a-zA-Z0-9_]+$/, "Usernames can only include letters, numbers, and underscores.")
    .transform((value) => value.toLowerCase()),
  name: z
    .string()
    .trim()
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
});

function containsProhibitedWords(value?: string | null): boolean {
  if (!value) return false;
  const text = value.toLowerCase();
  const banned = [
    // Common profanity and slurs (non-exhaustive)
    "fuck","shit","bitch","asshole","bastard","cunt","dick","pussy","whore","slut",
    "rape","rapist","kill","murder","suicide",
    // Slurs (trimmed selection)
    "nigger","nigga","chink","gook","spic","wetback","faggot","tranny","retard","retarded",
    // variations
    "kkk","heil","hitler",
  ];
  return banned.some((w) => text.includes(w));
}

export async function POST(request: Request) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const rateLimit = await enforceRateLimit({
      request,
      type: "register",
    });

    if (!rateLimit.ok) {
      return rateLimit.response;
    }

    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const candidateEmail =
    body &&
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as Record<string, unknown>).email === "string"
      ? (body as Record<string, string>).email
      : undefined;

  const rateLimit = await enforceRateLimit({
    request,
    type: "register",
    identifier: candidateEmail,
  });

  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { email, password, name, username } = parsed.data;

    if (containsProhibitedWords(username) || containsProhibitedWords(name ?? null)) {
      const errors: Record<string, string[]> = {};
      if (containsProhibitedWords(username)) {
        errors.username = ["Choose a different username without offensive words."];
      }
      if (name && containsProhibitedWords(name)) {
        errors.name = ["Choose a different name without offensive words."];
      }
      return NextResponse.json({ errors }, { status: 422 });
    }

    const [existingUser, existingUsername, pendingUsername] =
      await Promise.all([
        prisma.user.findUnique({
          where: { email },
        }),
        prisma.user.findUnique({
          where: { username },
        }),
        prisma.registrationVerification.findUnique({
          where: { username },
        }),
      ]);

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 },
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { message: "That username is already taken." },
        { status: 409 },
      );
    }

    if (pendingUsername && pendingUsername.email !== email) {
      return NextResponse.json(
        {
          message:
            "That username is currently reserved while another person completes verification. Choose a different one.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { token } = await createRegistrationVerification({
      email,
      username,
      name: name ?? null,
      passwordHash,
    });

    const origin = request.headers.get("origin") ?? "";
    const baseUrl =
      origin || process.env.APP_BASE_URL || new URL(request.url).origin;
    const verifyUrl = `${baseUrl.replace(/\/+$/, "")}/verify-email?token=${token}`;

    if (!isEmailConfigured()) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            message:
              "Unable to send verification email right now. Please try again later.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          message:
            "Email delivery is not configured. Use the link below to verify your account in development.",
          verificationUrl: verifyUrl,
        },
        { status: 200 },
      );
    }

    try {
      await dispatchEmailVerificationEmail({
        to: email,
        verifyUrl,
      });
    } catch (error) {
      console.error("Verification email error", error);
      return NextResponse.json(
        {
          message:
            "Unable to send verification email right now. Please try again later.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        message: "Check your inbox to verify your email before signing in.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Registration error", error);
    return NextResponse.json(
      { message: "Unable to create account right now." },
      { status: 500 },
    );
  }
}
