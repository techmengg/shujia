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
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { avatarUrl: true },
      })
    : null;
  const avatar = dbUser?.avatarUrl?.trim() ? dbUser.avatarUrl : "/noprofile.png";

  return (
    <header className={combinedClassName}>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6 lg:px-10 lg:py-3">
        <Link
          href="/"
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Go to Shujia home"
        >
          <Image
            src={logoSrc}
            alt="Shujia logo"
            width={40}
            height={40}
            className="site-logo h-9 w-9 object-contain sm:h-10 sm:w-10"
            priority
            quality={90}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <NavAuthButtons avatar={avatar} username={user?.username} />
        </div>
      </div>
    </header>
  );
}
