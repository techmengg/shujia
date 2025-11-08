import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="max-w-2xl text-sm text-white/65">
          Update your profile, privacy, and security without bouncing across multiple pages.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[220px_1fr]">
        <SettingsSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </main>
  );
}

