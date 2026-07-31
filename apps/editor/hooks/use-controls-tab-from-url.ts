// Derived from jnsahaj/tweakcn hooks/use-controls-tab-from-url.ts at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { getRouteApi } from "@tanstack/react-router";

const TABS = ["colors", "typography", "other", "ai"] as const;
export const DEFAULT_TAB = TABS[0];
export type ControlTab = (typeof TABS)[number];

const editorThemeRoute = getRouteApi("/editor/theme");

export const useControlsTabFromUrl = () => {
  const { tab: searchTab } = editorThemeRoute.useSearch();
  const navigate = editorThemeRoute.useNavigate();
  const tab = searchTab ?? DEFAULT_TAB;

  const handleSetTab = (tab: ControlTab) => {
    const nextTab = TABS.includes(tab) ? tab : DEFAULT_TAB;

    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        tab: nextTab === DEFAULT_TAB ? undefined : nextTab,
      }),
    });
  };

  return { tab, handleSetTab };
};
