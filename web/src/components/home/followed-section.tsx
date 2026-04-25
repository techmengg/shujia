"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import type { MangaSummary } from "@/lib/manga/types";

interface FollowedSectionProps {
  followedItems: MangaSummary[];
}

export function FollowedSection({ followedItems }: FollowedSectionProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-4 sm:gap-3">
          <h2 className="text-sm font-semibold text-surface-subtle sm:text-base">
            Your Followed List
          </h2>
          <Link
            href="/login?redirect=/"
            className="group inline-flex shrink-0 items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
          >
            <span className="underline-offset-4 group-hover:underline">
              log in to view
            </span>
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>
        <p className="text-sm italic text-surface-subtle">
          Your tracked series will live here once you&apos;re signed in.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3 sm:mb-4">
        <h2 className="text-sm font-semibold text-white sm:text-base">
          Your Followed List
        </h2>
        <Link
          href="/reading-list"
          className="group inline-flex shrink-0 items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
        >
          <span className="underline-offset-4 group-hover:underline">
            view list
          </span>
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>
      <MangaCarousel
        items={followedItems}
        emptyState={
          <p className="text-sm italic text-surface-subtle">
            Follow series to see updates here.
          </p>
        }
      />
    </section>
  );
}
