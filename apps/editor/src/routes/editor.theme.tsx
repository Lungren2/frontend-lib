// Derived from jnsahaj/tweakcn app/editor/theme/[[...themeId]] at
// f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import Editor from "@/components/editor/editor";
import { ThemeProvider } from "@/components/theme-provider";
import { createFileRoute } from "@tanstack/react-router";

const TABS = ["colors", "typography", "other", "ai"] as const;
type ControlTab = (typeof TABS)[number];

export type EditorSearch = {
  tab?: ControlTab;
  p?: string;
  theme?: string;
};

export const Route = createFileRoute("/editor/theme")({
  validateSearch: (search: Record<string, unknown>): EditorSearch => ({
    tab: TABS.includes(search.tab as ControlTab)
      ? (search.tab as ControlTab)
      : undefined,
    p:
      typeof search.p === "string" && search.p.length > 0
        ? search.p
        : undefined,
    theme:
      typeof search.theme === "string" && search.theme.length > 0
        ? search.theme
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Frontend Lib Theme Editor" },
      {
        name: "description",
        content:
          "Easily customize and preview your shadcn/ui theme with tweakcn. Modify colors, fonts, and styles in real-time.",
      },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  return (
    <ThemeProvider defaultTheme="light">
      <div className="relative isolate flex h-svh flex-col overflow-hidden">
        <main className="isolate flex flex-1 flex-col overflow-hidden">
          <Editor />
        </main>
      </div>
    </ThemeProvider>
  );
}
