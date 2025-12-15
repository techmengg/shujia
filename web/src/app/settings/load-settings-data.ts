import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  isThemeName,
} from "@/lib/theme/config";
import type { SettingsUser } from "@/types/settings";

export type SettingsPageData = {
  user: SettingsUser;
  sessionCount: number;
};

export async function loadSettingsData(): Promise<SettingsPageData> {
  const cookieStore = await cookies();
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
      showMatureContent: true,
      showExplicitContent: true,
      showPornographicContent: true,
      twoFactorEnabled: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const sessionCount = await prisma.session.count({
    where: { userId: user.id },
  });

  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isThemeName(themeCookie) ? themeCookie : THEME_DEFAULT;

  return {
    user: { ...dbUser, theme } satisfies SettingsUser,
    sessionCount: Math.max(sessionCount, 1),
  };
}
