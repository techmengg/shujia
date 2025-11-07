import type { SettingsContentSection } from "@/types/settings";

export type SettingsRouteSlug = "profile" | "account" | "appearance" | "security";

export type SettingsNavItem = {
  slug: SettingsRouteSlug;
  label: string;
  description: string;
  sections: SettingsContentSection[];
};

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    slug: "profile",
    label: "Profile",
    description: "Display name, handle, bio, and avatar.",
    sections: ["profile"],
  },
  {
    slug: "account",
    label: "Account",
    description: "Email, password, and sign-out controls.",
    sections: ["account"],
  },
  {
    slug: "appearance",
    label: "Appearance",
    description: "Choose between light or dark themes.",
    sections: ["appearance"],
  },
  {
    slug: "security",
    label: "Security",
    description: "Two-factor auth, sessions, and danger zone.",
    sections: ["security", "sessions", "danger"],
  },
];
