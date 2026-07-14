// Derived from jnsahaj/tweakcn components/editor/action-bar/components/action-bar-buttons.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/store/editor-store";
import { CodeButton } from "./code-button";
import { ImportButton } from "./import-button";
import { ResetButton } from "./reset-button";
import { ThemeToggle } from "./theme-toggle";
import { UndoRedoButtons } from "./undo-redo-buttons";

interface ActionBarButtonsProps {
  onImportClick: () => void;
  onCodeClick: () => void;
}

export function ActionBarButtons({
  onImportClick,
  onCodeClick,
}: ActionBarButtonsProps) {
  const { resetToCurrentPreset, hasUnsavedChanges } = useEditorStore();

  const handleReset = () => {
    resetToCurrentPreset();
  };

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <Separator orientation="vertical" className="mx-1 h-8" />
      <UndoRedoButtons />
      <Separator orientation="vertical" className="mx-1 h-8" />
      <ResetButton onClick={handleReset} disabled={!hasUnsavedChanges()} />
      <ImportButton onClick={onImportClick} />
      <CodeButton onClick={onCodeClick} />
    </div>
  );
}
