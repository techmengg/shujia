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
    select: { id: true, username: true },
  });
  if (!owner) notFound();

  const viewer = await getCurrentUser();
  const ownerHref = `/${encodeURIComponent(owner.username.toLowerCase())}`;

  const [followsRaw, viewerFollows, followingCount] = await Promise.all([
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
    prisma.follow.count({ where: { followerId: owner.id } }),
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
      <header className="mb-4 border-b border-white/10 pb-3 sm:mb-5 sm:pb-4">
        <h1 className="sr-only">@{owner.username}&rsquo;s followers</h1>
        <Link
          href={ownerHref}
          className="text-xs font-medium text-accent transition-colors hover:text-white sm:text-sm"
        >
          @{owner.username}
        </Link>
        <nav
          aria-label="Followers and following"
          className="mt-2 flex items-baseline gap-4 sm:gap-5"
        >
          <Link
            href={`${ownerHref}/followers`}
            aria-current="page"
            className="text-sm font-semibold text-white underline underline-offset-[6px] decoration-accent decoration-2 sm:text-base"
          >
            Followers
            <span className="ml-1.5 text-[0.7rem] font-normal tabular-nums text-surface-subtle sm:text-xs">
              {users.length}
            </span>
          </Link>
          <Link
            href={`${ownerHref}/following`}
            className="text-sm font-semibold text-surface-subtle transition-colors hover:text-white sm:text-base"
          >
            Following
            <span className="ml-1.5 text-[0.7rem] font-normal tabular-nums sm:text-xs">
              {followingCount}
            </span>
          </Link>
        </nav>
      </header>

      {users.length > 0 ? (
        <ul className="divide-y divide-white/10">
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
        <p className="text-sm italic text-surface-subtle">No followers yet.</p>
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
