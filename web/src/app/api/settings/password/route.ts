import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildSessionCookie,
  createSession,
  getCurrentUser,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password must be at most 72 characters long"),
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

  const parsed = passwordSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 },
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      existingUser.password,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Current password is incorrect." },
        { status: 401 },
      );
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, existingUser.password);

    if (sameAsCurrent) {
      return NextResponse.json(
        { message: "Choose a password you haven't used before." },
        { status: 400 },
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: newHash,
        },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    const session = await createSession(user.id);

    const response = NextResponse.json({ message: "Password updated." });
    const cookie = buildSessionCookie(session.token, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    console.error("Password update error", error);
    return NextResponse.json(
      { message: "Unable to update your password right now." },
      { status: 500 },
    );
  }
}
