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
          />
        </Link>
        <div className="order-2 min-w-0 flex-1 md:order-2">
          <SearchBar isAuthenticated={Boolean(user)} />
        </div>

        <div className="order-3 ml-auto flex items-center gap-2 text-surface-subtle">
          <Link
            href="/users"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-transparent transition hover:border-white hover:text-white sm:h-8 sm:w-8"
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
            href={user ? "/settings" : "/login?redirect=/settings"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-transparent transition hover:border-white hover:text-white sm:h-8 sm:w-8"
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
