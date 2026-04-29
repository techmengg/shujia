"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HIDE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/settings",
  "/reading-list/import-report",
];

export function LayoutWithSidebar({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const hideSidebar = HIDE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (hideSidebar) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row lg:items-start">
      <main className="min-w-0 flex-1">{children}</main>
      <aside
        aria-label="Site navigation sidebar"
        className="scrollbar-none border-t border-white/10 px-4 py-6 sm:px-6 lg:sticky lg:top-0 lg:max-h-screen lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-6 lg:py-6"
      >
        {sidebar}
      </aside>
    </div>
  );
}
