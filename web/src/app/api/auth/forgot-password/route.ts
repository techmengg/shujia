import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { dispatchPasswordResetEmail } from "@/lib/email/password-reset";
import { isEmailConfigured } from "@/lib/email/transport";
import { isSafeRequestOrigin } from "@/lib/security/origin";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth/password-reset";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
});

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
      type: "forgotPassword",
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
    type: "forgotPassword",
    identifier: candidateEmail,
  });

  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        {
          message:
            "If an account exists for that email, you will receive password reset instructions shortly.",
        },
        { status: 200 },
      );
    }

    const tokenDetails = await createPasswordResetToken(user.id);

    const origin = request.headers.get("origin") ?? "";
    const baseUrl = origin || process.env.APP_BASE_URL;
    const resetUrl =
      baseUrl && tokenDetails
        ? `${baseUrl.replace(/\/+$/, "")}/reset-password?token=${tokenDetails.token}`
        : `${request.url.replace(/\/[^/]*$/, "")}/reset-password?token=${tokenDetails.token}`;

    if (!isEmailConfigured()) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            message:
              "Unable to send password reset instructions at this time. Please contact support.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          message:
            "Email delivery is not configured. Use the reset link directly in this development environment.",
          resetUrl,
        },
        { status: 200 },
      );
    }

    try {
      await dispatchPasswordResetEmail({
        to: user.email,
        resetUrl,
      });
    } catch (error) {
      console.error("Password reset email error", error);
      return NextResponse.json(
        {
          message:
            "Unable to send password reset instructions right now. Please try again later.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        message:
          "If an account exists for that email, you will receive password reset instructions shortly.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json(
      { message: "Unable to process password reset right now." },
      { status: 500 },
    );
  }
}
