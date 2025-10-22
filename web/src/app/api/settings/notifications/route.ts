import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const notificationsSchema = z.object({
  marketingEmails: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  weeklyDigestEmails: z.boolean().optional(),
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

  const parsed = notificationsSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ errors }, { status: 422 });
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No changes received." });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updates,
      select: {
        marketingEmails: true,
        productUpdates: true,
        weeklyDigestEmails: true,
      },
    });

    return NextResponse.json({
      data: updated,
      message: "Notification preferences updated.",
    });
  } catch (error) {
    console.error("Notification preferences update error", error);
    return NextResponse.json(
      { message: "Unable to update notifications right now." },
      { status: 500 },
    );
  }
}
