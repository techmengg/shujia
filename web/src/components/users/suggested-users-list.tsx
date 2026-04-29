"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FollowButton } from "@/components/users/follow-button";

export interface SuggestedUserItem {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

interface SuggestedUsersListProps {
  users: SuggestedUserItem[];
  isAuthenticated: boolean;
}

export function SuggestedUsersList({
  users,
  isAuthenticated,
}: SuggestedUsersListProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = users.filter((u) => !dismissed.has(u.id));
  if (visible.length === 0) return null;

  return (
    <ul className="space-y-3">
      {visible.map((user) => {
        const trimmedName = user.name?.trim();
        const hasName = Boolean(trimmedName);
        const displayName = trimmedName || `@${user.username}`;
        const initial = displayName.charAt(0).toUpperCase();
        const profileHref = `/${encodeURIComponent(user.username.toLowerCase())}`;

        return (
          <li key={user.id} className="flex items-start gap-2">
            <Link
              href={profileHref}
              aria-label={`${displayName}'s profile`}
              className="relative h-8 w-8 shrink-0 overflow-hidden bg-white/5 transition-opacity hover:opacity-85"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  fill
                  sizes="32px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[0.7rem] font-semibold text-white/70">
                  {initial}
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={profileHref}
                  className="line-clamp-1 min-w-0 text-[0.8rem] font-medium leading-tight text-white transition-colors hover:text-accent"
                >
                  {hasName ? trimmedName : `@${user.username}`}
                </Link>
                <FollowButton
                  targetUsername={user.username}
                  initiallyFollowing={false}
                  isAuthenticated={isAuthenticated}
                  variant="compact"
                  onFollowed={() => {
                    setDismissed((prev) => {
                      const next = new Set(prev);
                      next.add(user.id);
                      return next;
                    });
                  }}
                />
              </div>
              {hasName ? (
                <Link
                  href={profileHref}
                  className="block text-[0.65rem] leading-tight text-surface-subtle transition-colors hover:text-accent"
                >
                  @{user.username}
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
