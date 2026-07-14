// Derived from jnsahaj/tweakcn components/editor/action-bar/components/code-button.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Braces } from "lucide-react";

interface CodeButtonProps extends React.ComponentProps<typeof Button> {}

export function CodeButton({ className, ...props }: CodeButtonProps) {
  return (
    <TooltipWrapper label="View theme code" asChild>
      <Button aria-label="Code" variant="ghost" size="sm" className={cn(className)} {...props}>
        <Braces className="size-3.5" />
        <span className="hidden text-sm md:block">Code</span>
      </Button>
    </TooltipWrapper>
  );
}
