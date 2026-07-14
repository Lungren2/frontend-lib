// Derived from jnsahaj/tweakcn components/editor/action-bar/components/reset-button.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface ResetButtonProps extends React.ComponentProps<typeof Button> {}

export function ResetButton({ className, ...props }: ResetButtonProps) {
  return (
    <TooltipWrapper label="Reset to preset defaults" asChild>
      <Button aria-label="Reset" variant="ghost" size="sm" className={cn(className)} {...props}>
        <RefreshCw className="size-3.5" />
        <span className="hidden text-sm md:block">Reset</span>
      </Button>
    </TooltipWrapper>
  );
}
