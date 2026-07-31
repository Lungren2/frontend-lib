import { getRouteApi } from "@tanstack/react-router";

const PREVIEW_TABS = [
  "frontend-lib",
  "cards",
  "dashboard",
  "application",
  "marketing",
  "mail",
  "typography",
  "colors",
] as const;

export const DEFAULT_PREVIEW_TAB = "cards";
export type PreviewTab = (typeof PREVIEW_TABS)[number];

const editorThemeRoute = getRouteApi("/editor/theme");

export function usePreviewTabFromUrl() {
  const { p: previewQuery } = editorThemeRoute.useSearch();
  const navigate = editorThemeRoute.useNavigate();
  const previewTab = PREVIEW_TABS.includes(previewQuery as PreviewTab)
    ? (previewQuery as PreviewTab)
    : DEFAULT_PREVIEW_TAB;

  const setPreviewTab = (value: string) => {
    const nextPreview = PREVIEW_TABS.includes(value as PreviewTab)
      ? (value as PreviewTab)
      : DEFAULT_PREVIEW_TAB;

    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        p: nextPreview === DEFAULT_PREVIEW_TAB ? undefined : nextPreview,
      }),
    });
  };

  return { previewTab, setPreviewTab };
}
