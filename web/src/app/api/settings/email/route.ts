import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
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

  const parsed = emailSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { email, currentPassword } = parsed.data;

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

    if (email === existingUser.email) {
      return NextResponse.json({ message: "Your email is already up to date." });
    }

    const emailConflict = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (emailConflict) {
      return NextResponse.json(
        { message: "That email address is already in use." },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
      },
    });

    return NextResponse.json({
      message: "Email updated.",
      data: { email },
    });
  } catch (error) {
    console.error("Email update error", error);
    return NextResponse.json(
      { message: "Unable to update your email right now." },
      { status: 500 },
    );
  }
}
