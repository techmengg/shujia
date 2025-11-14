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
import { NavAuthButtons } from "@/components/layout/nav-auth-buttons";

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
            quality={90}
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
            <SearchBar />
          </div>
        </div>

        <div className="order-3 ml-auto flex shrink-0 items-center gap-2 text-surface-subtle">
          <MobileQuickActions
            settingsHref={user ? "/settings/profile" : "/login?redirect=/settings/profile"}
          />

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

          <NavAuthButtons avatar={avatar} username={user?.username} />
        </div>
      </div>
    </header>
  );
}

