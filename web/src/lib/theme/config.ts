export type ThemeName = "dark" | "light" | "void" | "ocean";

export const THEME_COOKIE_NAME = "shujia-theme";
export const THEME_DEFAULT: ThemeName = "ocean";

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
    value: "ocean",
    label: "Ocean",
    description: "Deep blue surfaces with cyan accents.",
    preview: {
      from: "#25274D",
      to: "#2E9CCA",
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
