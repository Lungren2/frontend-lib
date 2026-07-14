"use client";

// Derived from jnsahaj/tweakcn components/editor/action-bar/action-bar.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { ActionBarButtons } from "@/components/editor/action-bar/components/action-bar-buttons";
import { HorizontalScrollArea } from "@/components/horizontal-scroll-area";
import { useDialogActions } from "@/hooks/use-dialog-actions";

export function ActionBar() {
  const { setCssImportOpen, setCodePanelOpen } = useDialogActions();

  return (
    <div className="border-b">
      <HorizontalScrollArea className="flex h-14 w-full items-center justify-end gap-4 px-4">
        <ActionBarButtons
          onImportClick={() => setCssImportOpen(true)}
          onCodeClick={() => setCodePanelOpen(true)}
        />
      </HorizontalScrollArea>
    </div>
  );
}
