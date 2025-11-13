"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth/auth-provider";

interface NavAuthButtonsProps {
  avatar?: string;
  username?: string | null;
}

export function NavAuthButtons({ avatar, username }: NavAuthButtonsProps) {
  const { isAuthenticated } = useAuth();
  
  const profileHref = username ? `/profile/${username}` : "/profile";

  return (
    <>
      {isAuthenticated ? (
        <>
          <Link
            href="/settings/profile"
            className="hidden h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-transparent transition hover:border-white hover:text-white sm:inline-flex sm:h-8 sm:w-8"
            aria-label="Account settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
          <Link
            href="/reading-list"
            className="hidden h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-transparent transition hover:border-white hover:text-white sm:inline-flex sm:h-8 sm:w-8"
            aria-label="Reading list"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75c-2.106-1.148-4.606-1.5-7.5-1.5v12c2.894 0 5.394.352 7.5 1.5m0-12c2.106-1.148 4.606-1.5 7.5-1.5v12c-2.894 0-5.394.352-7.5 1.5m0-12v12"
              />
            </svg>
          </Link>
          <Link
            href={profileHref}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-transparent transition hover:border-white sm:h-10 sm:w-10"
            aria-label="User profile"
          >
            <Image
              src={avatar || "/noprofile.jpg"}
              alt="User avatar"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="hidden items-center rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:border-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="hidden items-center rounded-full border border-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent transition hover:border-white hover:text-white sm:inline-flex"
          >
            Sign up
          </Link>
        </>
      )}
    </>
  );
}

