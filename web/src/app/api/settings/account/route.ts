import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildClearedSessionCookie,
  getCurrentUser,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirm: z
    .string()
    .trim()
    .refine((value) => value === "DELETE", {
      message: 'You must type "DELETE" to confirm.',
    }),
});

export async function DELETE(request: Request) {
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

  const parsed = deleteAccountSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { password } = parsed.data;

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
      password,
      existingUser.password,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Password is incorrect." },
        { status: 401 },
      );
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    const response = NextResponse.json({ message: "Account deleted." });
    const clearedCookie = buildClearedSessionCookie();
    response.cookies.set(
      clearedCookie.name,
      clearedCookie.value,
      clearedCookie.options,
    );

    return response;
  } catch (error) {
    console.error("Account deletion error", error);
    return NextResponse.json(
      { message: "Unable to delete your account right now." },
      { status: 500 },
    );
  }
}
