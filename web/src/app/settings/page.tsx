import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
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
    <div className="relative min-h-screen bg-surface text-surface-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-[-18rem] z-0 h-[36rem] bg-gradient-to-b from-accent/20 via-transparent to-transparent blur-[160px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-72 bg-gradient-to-t from-black/80 via-surface/40 to-transparent" />

      <SiteHeader className="bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70" />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account settings</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Control your Shujia experience</h1>
          <p className="max-w-2xl text-sm text-white/65">
            Tune your profile, security, and notifications. Changes apply instantly across the app.
          </p>
        </header>

        <SettingsPageContent user={dbUser} sessionCount={Math.max(sessionCount, 1)} />
      </main>
    </div>
  );
}
