"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MangaCarousel } from "@/components/manga/manga-carousel";
import type { MangaSummary } from "@/lib/mangadex/types";

interface FollowedListSectionProps {
  initialUser: boolean;
  followedItems: MangaSummary[];
  placeholderItems: MangaSummary[];
}

/**
 * Client-side component that handles auth-aware rendering
 * Checks cookies on mount to show correct state
 */
export function FollowedListSection({
  initialUser,
  followedItems,
  placeholderItems,
}: FollowedListSectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if session cookie exists on client
    const hasSession = document.cookie.split("; ").some((c) => c.startsWith("mynkdb_session="));
    
    // If mismatch detected, reload to get fresh data
    if (hasSession !== initialUser) {
      setIsAuthenticated(hasSession);
      // Force reload if server state doesn't match cookie
      if (!initialUser && hasSession) {
        window.location.reload();
      }
    } else {
      setIsAuthenticated(hasSession);
    }
  }, [initialUser]);

  // Always use the authenticated state after mount
  const showAuthContent = isAuthenticated;
  const items = showAuthContent ? followedItems : placeholderItems;

  return (
    <section className="mt-6 space-y-4" suppressHydrationWarning>
      {showAuthContent ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h2 className="text-sm font-semibold text-white sm:text-lg">
              Latest Updates from Your Followed List
            </h2>
            <Link
              href="/reading-list"
              className="text-[0.7rem] uppercase tracking-[0.15em] text-surface-subtle transition hover:text-white sm:text-xs sm:tracking-[0.2em]"
            >
              View list
            </Link>
          </div>
          <div className="relative">
            <MangaCarousel
              items={items}
              emptyState={
                <p className="rounded-2xl border border-white/15 bg-black/80 px-4 py-6 text-center text-sm text-surface-subtle">
                  Follow series to see updates here.
                </p>
              }
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h2 className="text-sm font-semibold text-white/60 sm:text-lg">
              Your Followed List
            </h2>
          </div>
          <div className="relative">
            <div className="h-24 rounded-2xl border border-white/12 bg-white/[0.04] sm:h-28 md:h-32" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="rounded-2xl border border-white/20 bg-black/70 px-5 py-3 text-xs font-semibold text-white">
                <Link href="/login?redirect=/" className="transition hover:text-accent">
                  Log in to view
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

