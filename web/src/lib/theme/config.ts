export type ThemeName = "dark" | "light" | "void";

export const THEME_COOKIE_NAME = "shujia-theme";
export const THEME_DEFAULT: ThemeName = "void";

export type ThemeOption = {
  value: ThemeName;
  label: string;
  description: string;
  preview: {
    from: string;
    to: string;
  };
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "dark",
    label: "Midnight",
    description: "High contrast blacks with electric accent blues optimized for low light.",
    preview: {
      from: "#05060b",
      to: "#0f172a",
    },
  },
  {
    value: "light",
    label: "Aurora",
    description: "Minimal light UI with subtle borders and roomy spacing.",
    preview: {
      from: "#f6f8fb",
      to: "#e8edf7",
    },
  },
  {
    value: "void",
    label: "Void",
    description: "A pure-black canvas with neon accents for OLED displays.",
    preview: {
      from: "#000000",
      to: "#050505",
    },
  },
];

export function isThemeName(value: string | undefined | null): value is ThemeName {
  if (!value) return false;
  return THEME_OPTIONS.some((option) => option.value === value);
}
