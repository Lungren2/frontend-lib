// Derived from jnsahaj/tweakcn hooks/use-controls-tab-from-url.ts at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { useQueryState } from "nuqs";

const TABS = ["colors", "typography", "other", "ai"] as const;
export const DEFAULT_TAB = TABS[0];
export type ControlTab = (typeof TABS)[number];

export const useControlsTabFromUrl = () => {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: DEFAULT_TAB,
    parse: (value: string) => {
      // Synchronously validate the tab value, and if it's invalid, fallback to the default tab
      if (!TABS.includes(value as ControlTab)) {
        return DEFAULT_TAB;
      }
      return value as ControlTab;
    },
  });

  const handleSetTab = (tab: ControlTab) => {
    // If the incoming tab is invalid, fallback to the default tab
    if (!TABS.includes(tab)) {
      setTab(DEFAULT_TAB);
      return;
    }

    setTab(tab);
  };

  return { tab, handleSetTab };
};
