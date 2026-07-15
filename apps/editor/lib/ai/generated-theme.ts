// Derived from jnsahaj/tweakcn lib/ai/generate-theme/index.ts at
// f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import {
  themeStylesSchema,
  themeStylesSchemaWithoutSpacing,
  type ThemeStyles,
  type ThemeStylesWithoutSpacing,
} from "@/types/theme";

export const COLOR_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "shadow-color",
] as const;

export const FONT_FAMILY_PATTERN =
  "^(?:(?:-?[A-Za-z][A-Za-z0-9 -]*|\\\"[A-Za-z0-9 -]+\\\"|'[A-Za-z0-9 -]+')\\s*,\\s*)*(?:-?[A-Za-z][A-Za-z0-9 -]*|\\\"[A-Za-z0-9 -]+\\\"|'[A-Za-z0-9 -]+')$";

const COMMON_GENERATED_KEYS = [
  "font-sans",
  "font-serif",
  "font-mono",
  "radius",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "letter-spacing",
] as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const FONT_FAMILY = new RegExp(FONT_FAMILY_PATTERN);
const REM_VALUE = /^\d+(?:\.\d+)?rem$/;
const PX_VALUE = /^-?\d+(?:\.\d+)?px$/;
const EM_VALUE = /^-?\d+(?:\.\d+)?em$/;

type GeneratedMode = ThemeStylesWithoutSpacing["light"];

export class GeneratedThemeValidationError extends Error {
  override name = "GeneratedThemeValidationError";
}

export function isValidThemeSpacing(value: string | undefined): boolean {
  return value === undefined || REM_VALUE.test(value);
}

function validateMode(styles: GeneratedMode, mode: "light" | "dark") {
  for (const key of COLOR_KEYS) {
    if (!HEX_COLOR.test(styles[key])) {
      throw new GeneratedThemeValidationError(`Generated ${mode}.${key} must be a 6-digit HEX color.`);
    }
  }

  for (const key of ["font-sans", "font-serif", "font-mono"] as const) {
    const font = styles[key].trim();
    if (font.length > 500 || !FONT_FAMILY.test(font)) {
      throw new GeneratedThemeValidationError(`Generated ${mode}.${key} is invalid.`);
    }
  }

  if (!REM_VALUE.test(styles.radius)) {
    throw new GeneratedThemeValidationError(`Generated ${mode}.radius must use rem units.`);
  }

  for (const key of ["shadow-blur", "shadow-spread", "shadow-offset-x", "shadow-offset-y"] as const) {
    if (!PX_VALUE.test(styles[key])) {
      throw new GeneratedThemeValidationError(`Generated ${mode}.${key} must use px units.`);
    }
  }

  if (Number(styles["shadow-blur"].replace("px", "")) < 0) {
    throw new GeneratedThemeValidationError(`Generated ${mode}.shadow-blur cannot be negative.`);
  }

  const opacity = Number(styles["shadow-opacity"]);
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new GeneratedThemeValidationError(`Generated ${mode}.shadow-opacity must be between 0 and 1.`);
  }

  if (!EM_VALUE.test(styles["letter-spacing"])) {
    throw new GeneratedThemeValidationError(`Generated ${mode}.letter-spacing must use em units.`);
  }
}

function normalizeCommonStyles(theme: ThemeStylesWithoutSpacing): ThemeStylesWithoutSpacing {
  const dark = { ...theme.dark };
  for (const key of COMMON_GENERATED_KEYS) dark[key] = theme.light[key];
  return { light: { ...theme.light }, dark };
}

export function parseGeneratedTheme(value: unknown): ThemeStylesWithoutSpacing {
  const theme = themeStylesSchemaWithoutSpacing.parse(value);
  validateMode(theme.light, "light");
  validateMode(theme.dark, "dark");
  return normalizeCommonStyles(theme);
}

export function parseGeneratedThemeResponse(value: unknown): ThemeStyles {
  const theme = themeStylesSchema.parse(value);
  validateMode(theme.light, "light");
  validateMode(theme.dark, "dark");
  for (const mode of ["light", "dark"] as const) {
    const spacing = theme[mode].spacing;
    if (!isValidThemeSpacing(spacing)) {
      throw new GeneratedThemeValidationError(`Generated ${mode}.spacing must use rem units.`);
    }
  }
  const normalized = normalizeCommonStyles(theme);

  return {
    light: { ...normalized.light, spacing: theme.light.spacing },
    dark: { ...normalized.dark, spacing: theme.light.spacing },
  };
}
