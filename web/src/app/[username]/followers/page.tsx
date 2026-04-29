import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRow, type UserRowData } from "@/components/users/user-row";
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

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function FollowersPage({ params }: PageProps) {
  const { username: rawUsername } = await params;
  if (isReserved(rawUsername)) notFound();

  const username = decodeURIComponent(rawUsername.trim()).toLowerCase();
  if (!username) notFound();

  const owner = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, name: true },
  });
  if (!owner) notFound();

  const viewer = await getCurrentUser();

  const [followsRaw, viewerFollows] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: owner.id },
      orderBy: { createdAt: "desc" },
      select: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    }),
    viewer
      ? prisma.follow.findMany({
          where: { followerId: viewer.id },
          select: { followingId: true },
        })
      : Promise.resolve([]),
  ]);

  const viewerFollowingIds = new Set(viewerFollows.map((f) => f.followingId));

  const users: UserRowData[] = followsRaw.map((f) => ({
    id: f.follower.id,
    username: f.follower.username,
    name: f.follower.name,
    avatarUrl: f.follower.avatarUrl,
    bio: f.follower.bio,
    viewerIsFollowing: viewerFollowingIds.has(f.follower.id),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-4 sm:mb-6">
        <p className="text-[0.7rem] text-white/40 sm:text-xs">
          <Link
            href={`/${encodeURIComponent(owner.username.toLowerCase())}`}
            className="text-accent transition-colors hover:text-white"
          >
            @{owner.username}
          </Link>
          <span className="mx-1.5 text-white/15">·</span>
          <Link
            href={`/${encodeURIComponent(owner.username.toLowerCase())}/following`}
            className="text-surface-subtle transition-colors hover:text-accent"
          >
            following
          </Link>
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
          Followers
        </h1>
        <p className="mt-1 text-[0.7rem] text-white/40 sm:text-xs">
          <span className="tabular-nums text-white/60">{users.length}</span>{" "}
          {users.length === 1 ? "person" : "people"} following @{owner.username}
        </p>
      </header>

      {users.length > 0 ? (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              viewerId={viewer?.id ?? null}
              isAuthenticated={Boolean(viewer)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-surface-subtle">
          No followers yet.
        </p>
      )}
    </main>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const handle = decodeURIComponent(rawUsername ?? "").trim().replace(/^@/, "");
  if (!handle) return { title: "Followers" };
  const possessive =
    handle.endsWith("s") || handle.endsWith("S") ? `${handle}'` : `${handle}'s`;
  return { title: `${possessive} followers` };
}
