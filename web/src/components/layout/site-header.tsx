import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { SearchBar } from "@/components/search/search-bar";
import { getCurrentUser } from "@/lib/auth/session";

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

  const user = await getCurrentUser();

  const greeting =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : undefined);

  return (
    <header className={combinedClassName}>
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-10 lg:py-3">
        <Link
          href="/"
          className="order-1 group flex items-center gap-2 pr-1 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Go to ShujiaDB home"
        >
          <Image
            src="/shujia.png"
            alt="ShujiaDB logo"
            width={36}
            height={36}
            className="h-8 w-8 rounded-md border border-white/20 object-cover grayscale transition group-hover:grayscale-0 sm:h-9 sm:w-9"
            priority
          />
          <span className="text-lg font-semibold uppercase tracking-[0.2em] text-white transition group-hover:text-accent sm:text-xl">
            ShujiaDB
          </span>
        </Link>
        <div className="order-3 w-full md:order-2 md:flex-1">
          <SearchBar />
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 text-surface-subtle md:order-3">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-transparent transition hover:border-white hover:text-white sm:h-9 sm:w-9"
            aria-label="Settings"
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
          </button>
          {user ? (
            <>
              <Link
                href="/profile"
                className="inline-flex h-8 items-center justify-center rounded-full border border-white/20 bg-transparent px-3 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:border-white sm:h-9"
                aria-label="User profile"
              >
                {greeting ?? "Profile"}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:border-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full border border-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent transition hover:border-white hover:text-white"
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
