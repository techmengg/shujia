import Image from "next/image";
import Link from "next/link";

import { FollowButton } from "@/components/users/follow-button";

export interface UserRowData {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  viewerIsFollowing: boolean;
}

interface UserRowProps {
  user: UserRowData;
  viewerId: string | null;
  isAuthenticated: boolean;
}

export function UserRow({ user, viewerId, isAuthenticated }: UserRowProps) {
  const trimmedName = user.name?.trim();
  const hasName = Boolean(trimmedName);
  const displayName = trimmedName || `@${user.username}`;
  const initial = displayName.charAt(0).toUpperCase();
  const profileHref = `/${encodeURIComponent(user.username.toLowerCase())}`;
  const bio = user.bio?.trim();
  const isOwner = viewerId === user.id;

  return (
    <li className="flex items-center gap-3 py-3 sm:gap-4">
      <Link
        href={profileHref}
        aria-label={`${displayName}'s profile`}
        className="relative h-10 w-10 shrink-0 overflow-hidden bg-white/5 transition-opacity hover:opacity-85 sm:h-12 sm:w-12"
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            fill
            sizes="48px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/70">
            {initial}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={profileHref}
          className="line-clamp-1 block text-sm font-medium leading-tight text-white transition-colors hover:text-accent"
        >
          {hasName ? trimmedName : `@${user.username}`}
        </Link>
        {hasName ? (
          <Link
            href={profileHref}
            className="line-clamp-1 mt-0.5 block text-xs leading-tight text-surface-subtle transition-colors hover:text-accent"
          >
            @{user.username}
          </Link>
        ) : null}
        {bio ? (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-surface-subtle">
            {bio}
          </p>
        ) : null}
      </div>
      <FollowButton
        targetUsername={user.username}
        initiallyFollowing={user.viewerIsFollowing}
        isAuthenticated={isAuthenticated}
        isOwner={isOwner}
        className="shrink-0"
      />
    </li>
  );
}
