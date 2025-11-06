"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const FALLBACK_AVATAR = "/noprofile.jpg";

export interface UserItemDto {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO
}

interface UsersListProps {
  users: UserItemDto[];
}

export function UsersList({ users }: UsersListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = u.name?.toLowerCase() ?? "";
      const username = u.username?.toLowerCase() ?? "";
      return name.includes(q) || username.includes(q);
    });
  }, [query, users]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users"
          aria-label="Search users"
          className="w-full rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/30"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            <circle cx="10" cy="10" r="6" />
          </svg>
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-white/60">
          No matching users.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
          {filtered.map((u) => {
            const displayName = u.name?.trim() || (u.username ? `@${u.username}` : "User");
            const avatar = u.avatarUrl?.trim() ? u.avatarUrl : FALLBACK_AVATAR;
            const profileHref = u.username ? `/profile/${u.username}` : "/profile";
            const created = new Date(u.createdAt);

            return (
              <li key={u.id}>
                <Link
                  href={profileHref}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span className="relative block h-10 w-10 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                    <Image
                      src={avatar}
                      alt={`${displayName} avatar`}
                      fill
                      sizes="40px"
                      quality={100}
                      unoptimized
                      className="object-cover"
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-white">{displayName}</span>
                    {u.username ? (
                      <span className="truncate text-xs text-white/60">@{u.username}</span>
                    ) : null}
                  </span>
                  <span className="ml-auto text-xs text-white/40">
                    {Number.isNaN(created.getTime())
                      ? ""
                      : new Intl.DateTimeFormat("en", { year: "numeric", month: "short" }).format(created)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

