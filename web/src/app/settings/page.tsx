import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { SettingsPageContent } from "@/components/settings/settings-page-content";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/settings");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      timezone: true,
      marketingEmails: true,
      productUpdates: true,
      weeklyDigestEmails: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const sessionCount = await prisma.session.count({
    where: { userId: user.id },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="max-w-2xl text-sm text-white/65">
          Update your profile, security, and notifications without the extra clutter.
        </p>
      </header>

      <div className="mt-10">
        <SettingsPageContent user={dbUser} sessionCount={Math.max(sessionCount, 1)} />
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Shujia | Settings",
};
