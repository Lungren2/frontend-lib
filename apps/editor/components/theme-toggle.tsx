"use client";

// Derived from jnsahaj/tweakcn components/theme-toggle.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { TooltipWrapper } from "./tooltip-wrapper";

interface ThemeToggleProps extends React.ComponentProps<typeof Button> {}

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX: x, clientY: y } = event;
    toggleTheme({ x, y });
  };

  return (
    <TooltipWrapper label="Toggle theme" asChild>
      <Button
        aria-label="Toggle theme"
        className={cn("cursor-pointer", className)}
        {...props}
        onClick={handleThemeToggle}
      >
        {theme === "light" ? <Sun /> : <Moon />}
      </Button>
    </TooltipWrapper>
  );
}
