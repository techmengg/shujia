import type { ThemeName } from "@/lib/theme/config";

export type SettingsUser = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  profileColor: string | null;
  favoriteMangaIds: string[];
  timezone: string;
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigestEmails: boolean;
  twoFactorEnabled: boolean;
  theme: ThemeName;
};

export type SettingsContentSection =
  | "profile"
  | "account"
  | "appearance"
  | "security"
  | "sessions"
  | "danger";
