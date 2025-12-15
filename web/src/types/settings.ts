import type { ThemeName } from "@/lib/theme/config";

export type SettingsUser = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigestEmails: boolean;
  showMatureContent: boolean;
  showExplicitContent: boolean;
  showPornographicContent: boolean;
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
