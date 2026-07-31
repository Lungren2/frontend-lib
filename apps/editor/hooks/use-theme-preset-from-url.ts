import { getRouteApi } from "@tanstack/react-router";
import React from "react";
import { useEditorStore } from "@/store/editor-store";

const editorThemeRoute = getRouteApi("/editor/theme");

export const useThemePresetFromUrl = () => {
  const { theme: preset } = editorThemeRoute.useSearch();
  const navigate = editorThemeRoute.useNavigate();
  const applyThemePreset = useEditorStore((state) => state.applyThemePreset);

  // Apply theme preset if it exists in URL and remove it
  React.useEffect(() => {
    if (preset) {
      applyThemePreset(preset);
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, theme: undefined }),
      });
    }
  }, [preset, navigate, applyThemePreset]);
};
