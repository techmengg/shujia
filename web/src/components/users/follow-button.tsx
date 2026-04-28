"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface FollowButtonProps {
  targetUsername: string;
  initiallyFollowing: boolean;
  isAuthenticated: boolean;
  isOwner?: boolean;
  variant?: "compact" | "default";
  className?: string;
}

export function FollowButton({
  targetUsername,
  initiallyFollowing,
  isAuthenticated,
  isOwner = false,
  variant = "default",
  className = "",
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);

  if (isOwner) return null;

  async function toggle() {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(
        window.location.pathname,
      )}`;
      return;
    }
    setPending(true);
    try {
      const url = `/api/users/${encodeURIComponent(
        targetUsername.toLowerCase(),
      )}/follow`;
      const res = await fetch(url, {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setFollowing((prev) => !prev);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  const isCompact = variant === "compact";
  const sizeClasses = isCompact
    ? "px-2 py-0.5 text-[0.65rem] sm:text-[0.7rem]"
    : "px-3 py-1 text-xs";

  const baseClasses = [
    "inline-flex items-center border font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    sizeClasses,
    following
      ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
      : "border-accent/50 text-accent hover:border-accent hover:text-white",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={baseClasses}
    >
      {pending ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
