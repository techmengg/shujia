import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isSafeRequestOrigin } from "@/lib/security/origin";

interface RouteContext {
  params: Promise<{ username: string }>;
}

async function resolveTarget(rawUsername: string) {
  const username = decodeURIComponent(rawUsername.trim()).replace(/^@/, "").toLowerCase();
  if (!username) return null;
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json(
      { message: "You must be signed in to follow." },
      { status: 401 },
    );
  }

  const { username } = await params;
  const target = await resolveTarget(username);
  if (!target) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }
  if (target.id === viewer.id) {
    return NextResponse.json(
      { message: "You can't follow yourself." },
      { status: 400 },
    );
  }

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: viewer.id,
        followingId: target.id,
      },
    },
    create: { followerId: viewer.id, followingId: target.id },
    update: {},
  });

  return NextResponse.json({ data: { following: true } });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }

  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json(
      { message: "You must be signed in." },
      { status: 401 },
    );
  }

  const { username } = await params;
  const target = await resolveTarget(username);
  if (!target) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  await prisma.follow.deleteMany({
    where: { followerId: viewer.id, followingId: target.id },
  });

  return NextResponse.json({ data: { following: false } });
}
