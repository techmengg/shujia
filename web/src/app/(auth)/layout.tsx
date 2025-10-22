import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-surface-foreground">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
