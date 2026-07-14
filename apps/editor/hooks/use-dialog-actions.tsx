// Derived from jnsahaj/tweakcn hooks/use-dialog-actions.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { CodePanelDialog } from "@/components/editor/code-panel-dialog";
import CssImportDialog from "@/components/editor/css-import-dialog";
import { toast } from "@/components/ui/use-toast";
import { useEditorStore } from "@/store/editor-store";
import { parseCssInput } from "@/utils/parse-css-input";
import { createContext, type ReactNode, useContext, useState } from "react";

interface DialogActionsContextType {
  cssImportOpen: boolean;
  codePanelOpen: boolean;
  setCssImportOpen: (open: boolean) => void;
  setCodePanelOpen: (open: boolean) => void;
  handleCssImport: (css: string) => void;
}

function useDialogActionsStore(): DialogActionsContextType {
  const [cssImportOpen, setCssImportOpen] = useState(false);
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const { themeState, setThemeState } = useEditorStore();

  const handleCssImport = (css: string) => {
    const { lightColors, darkColors } = parseCssInput(css);
    const importedCount = Object.keys(lightColors).length + Object.keys(darkColors).length;

    if (importedCount === 0) {
      throw new Error("No supported theme variables were found.");
    }

    setThemeState({
      ...themeState,
      styles: {
        light: { ...themeState.styles.light, ...lightColors },
        dark: { ...themeState.styles.dark, ...darkColors },
      },
    });

    toast({
      title: "CSS imported",
      description: "Known light and dark theme variables were merged.",
    });
  };

  return {
    cssImportOpen,
    codePanelOpen,
    setCssImportOpen,
    setCodePanelOpen,
    handleCssImport,
  };
}

export const DialogActionsContext = createContext<DialogActionsContextType | null>(null);

export function DialogActionsProvider({ children }: { children: ReactNode }) {
  const { themeState } = useEditorStore();
  const store = useDialogActionsStore();

  return (
    <DialogActionsContext value={store}>
      {children}
      <CssImportDialog
        open={store.cssImportOpen}
        onOpenChange={store.setCssImportOpen}
        onImport={store.handleCssImport}
      />
      <CodePanelDialog
        open={store.codePanelOpen}
        onOpenChange={store.setCodePanelOpen}
        themeEditorState={themeState}
      />
    </DialogActionsContext>
  );
}

export function useDialogActions(): DialogActionsContextType {
  const context = useContext(DialogActionsContext);

  if (!context) {
    throw new Error("useDialogActions must be used within a DialogActionsProvider");
  }

  return context;
}
