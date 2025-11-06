"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
        });

        if (!response.ok) {
          console.error("Logout failed", await response.text());
        }
      } catch (error) {
        console.error("Logout failed", error);
      } finally {
        router.replace("/");
        setTimeout(() => {
          router.refresh();
        }, 0);
      }
    });
  };

  return (
    <button
      type="button"
      className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:border-white disabled:opacity-60"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
