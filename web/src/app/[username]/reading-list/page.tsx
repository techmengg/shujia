import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReadingListClient } from "@/components/reading-list/reading-list-client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RESERVED_SEGMENTS = new Set(
  [
    "_next",
    "api",
    "profile",
    "reading-list",
    "roadmap",
    "settings",
    "users",
    "manga",
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "verify-email",
    "favicon.ico",
    "robots.txt",
  ].map((segment) => segment.toLowerCase()),
);

function isReserved(segment: string | undefined) {
  if (!segment) return true;
  const normalized = segment.trim().toLowerCase();
  if (!normalized || normalized.includes(".")) return true;
  return RESERVED_SEGMENTS.has(normalized);
}

interface UserReadingListPageProps {
  params: Promise<{ username: string }>;
}

export default async function UserReadingListPage({ params }: UserReadingListPageProps) {
  const { username: rawUsername } = await params;

  if (isReserved(rawUsername)) {
    notFound();
  }

  const username = decodeURIComponent(rawUsername.trim()).toLowerCase();
  if (!username) {
    notFound();
  }

  const owner = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });

  if (!owner) {
    notFound();
  }

  const viewer = await getCurrentUser();
  const viewerIsOwner = Boolean(viewer && viewer.id === owner.id);

  return (
    <ReadingListClient
      username={owner.username ?? username}
      viewerIsOwner={viewerIsOwner || undefined}
      initialOwnerLabel={`@${owner.username ?? username}`}
    />
  );
}

export async function generateMetadata({
  params,
}: UserReadingListPageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const handle = decodeURIComponent(rawUsername ?? "").trim().replace(/^@/, "");
  if (!handle) return { title: "Reading list" };

  const possessive =
    handle.endsWith("s") || handle.endsWith("S") ? `${handle}'` : `${handle}'s`;
  return { title: `${possessive} reading list` };
}
