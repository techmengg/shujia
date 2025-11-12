import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { SearchBar } from "@/components/search/search-bar";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  isThemeName,
} from "@/lib/theme/config";
import { MobileQuickActions } from "@/components/layout/mobile-quick-actions";

interface SiteHeaderProps {
  className?: string;
}

export async function SiteHeader({ className }: SiteHeaderProps) {
  const combinedClassName = [
    "relative z-10 border-b border-white/15 bg-black",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isThemeName(themeCookie) ? themeCookie : THEME_DEFAULT;
  const logoSrc = theme === "light" ? "/shujia-white.png" : "/shujia.png";

  const user = await getCurrentUser();
  const dbUser = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } })
    : null;
  const avatar = dbUser?.avatarUrl?.trim() ? dbUser.avatarUrl : "/noprofile.jpg";
  const profileHref = user?.username ? `/profile/${user.username}` : "/profile";

  return (
    <header className={combinedClassName}>
      <div className="mx-auto flex w-full max-w-7xl flex-nowrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-10 lg:py-3">
        <Link
          href="/"
          className="order-1 group flex items-center gap-2 pr-1 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Go to Shujia home"
        >
          <Image
            src={logoSrc}
            alt="Shujia logo"
            width={40}
            height={40}
            className="site-logo h-9 w-9 rounded-lg object-contain sm:h-10 sm:w-10"
            priority
            unoptimized
          />
        </Link>
        <div className="order-2 flex w-full items-center gap-3 md:order-2 md:flex-1">
          <Link
            href="/explore"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white hover:text-white sm:h-8 sm:w-8"
            aria-label="Explore"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.5 8.5l-3.5 1.4-1.4 3.5 3.5-1.4 1.4-3.5Z"
              />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <SearchBar isAuthenticated={Boolean(user)} />
          </div>
        </div>

        <div className="order-3 ml-auto flex items-center gap-2 text-surface-subtle">
          <MobileQuickActions settingsHref={user ? "/settings/profile" : "/login?redirect=/settings/profile"} />

          <Link
            href="/users"
            className="hidden h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-transparent transition hover:border-white hover:text-white sm:inline-flex sm:h-8 sm:w-8"
            aria-label="Browse users"
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
                d="M15 19.127a12.318 12.318 0 006.741-1.94 6.967 6.967 0 00-13.482 0A12.318 12.318 0 0015 19.127z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 13.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
              />
            </svg>
          </Link>
          <Link
            href={user ? "/settings/profile" : "/login?redirect=/settings/profile"}
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
          {user ? (
            <Link
              href={profileHref}
              className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-transparent transition hover:border-white sm:h-10 sm:w-10"
              aria-label="User profile"
            >
              <Image
                src={avatar}
                alt="User avatar"
                width={40}
                height={40}
                className="h-full w-full object-cover"
                unoptimized
              />
            </Link>
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
        </div>
      </div>
    </header>
  );
}
