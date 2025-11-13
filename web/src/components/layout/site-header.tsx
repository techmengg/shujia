import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  isThemeName,
} from "@/lib/theme/config";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";

interface SiteHeaderProps {
  className?: string;
}

export async function SiteHeader({ className }: SiteHeaderProps) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isThemeName(themeCookie) ? themeCookie : THEME_DEFAULT;
  const logoSrc = theme === "light" ? "/shujia-white.png" : "/shujia.png";

  const user = await getCurrentUser();
  const dbUser = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } })
    : null;
  const avatar = dbUser?.avatarUrl?.trim() ? dbUser.avatarUrl : "/noprofile.jpg";

  const initialUser = user ? {
    id: user.id,
    username: user.username,
    avatar,
  } : null;

  return <AuthAwareHeader logoSrc={logoSrc} initialUser={initialUser} theme={theme} />;
}
