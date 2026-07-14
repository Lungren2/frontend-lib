// Derived from jnsahaj/tweakcn components/editor/action-bar/components/import-button.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileCode } from "lucide-react";

interface ImportButtonProps extends React.ComponentProps<typeof Button> {}

export function ImportButton({ className, ...props }: ImportButtonProps) {
  return (
    <TooltipWrapper label="Import CSS variables" asChild>
      <Button aria-label="Import" variant="ghost" size="sm" className={cn(className)} {...props}>
        <FileCode className="size-3.5" />
        <span className="hidden text-sm md:block">Import</span>
      </Button>
    </TooltipWrapper>
  );
}
