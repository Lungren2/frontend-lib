import type { ThemeConfiguration } from "@frontend-lib/engine";
import type { CSSProperties } from "react";

import { defaultLightThemeStyles } from "@/config/theme";
import type { ThemeStyles } from "@/types/theme";

type ThemeMode = "light" | "dark";
type CustomPropertyStyle = CSSProperties & Record<`--ui-${string}`, string>;

function adaptMode(
  styles: ThemeStyles[ThemeMode],
): ThemeConfiguration[ThemeMode] {
  return {
    canvas: styles.background,
    text: styles.foreground,
    primary: styles.primary,
    onPrimary: styles["primary-foreground"],
    secondary: styles.secondary,
    onSecondary: styles["secondary-foreground"],
    accent: styles.accent,
    onAccent: styles["accent-foreground"],
    destructive: styles.destructive,
    onDestructive: styles["destructive-foreground"],
    border: styles.border,
    focus: styles.ring,
  };
}

export function createFrontendLibTheme(
  styles: ThemeStyles,
): ThemeConfiguration {
  return {
    light: adaptMode(styles.light),
    dark: adaptMode(styles.dark),
    fontSans: styles.light["font-sans"],
    fontSerif: styles.light["font-serif"],
    fontMono: styles.light["font-mono"],
    radius: styles.light.radius,
    spacing: styles.light.spacing ?? defaultLightThemeStyles.spacing,
  };
}

export function createFrontendLibPreviewStyle(
  theme: ThemeConfiguration,
  mode: ThemeMode,
): CustomPropertyStyle {
  const colors = theme[mode];
  return {
    "--ui-color-canvas": colors.canvas,
    "--ui-color-text": colors.text,
    "--ui-color-primary": colors.primary,
    "--ui-color-primary-hover": `color-mix(in oklab, ${colors.primary} 90%, transparent)`,
    "--ui-color-on-primary": colors.onPrimary,
    "--ui-color-secondary": colors.secondary,
    "--ui-color-secondary-hover": `color-mix(in oklab, ${colors.secondary} 80%, transparent)`,
    "--ui-color-on-secondary": colors.onSecondary,
    "--ui-color-subtle-hover": colors.accent,
    "--ui-color-on-subtle-hover": colors.onAccent,
    "--ui-color-destructive": colors.destructive,
    "--ui-color-on-destructive": colors.onDestructive,
    "--ui-color-border": colors.border,
    "--ui-color-focus": colors.focus,
    "--ui-font-sans": theme.fontSans,
    "--ui-font-serif": theme.fontSerif,
    "--ui-font-mono": theme.fontMono,
    "--ui-radius-medium": `max(0px, calc(${theme.radius} - 2px))`,
    "--ui-space-2": `calc(${theme.spacing} * 2)`,
    "--ui-space-3": `calc(${theme.spacing} * 3)`,
    "--ui-space-4": `calc(${theme.spacing} * 4)`,
    "--ui-space-6": `calc(${theme.spacing} * 6)`,
    backgroundColor: "var(--ui-color-canvas)",
    color: "var(--ui-color-text)",
    fontFamily: "var(--ui-font-sans)",
  };
}
