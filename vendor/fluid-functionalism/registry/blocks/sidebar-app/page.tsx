"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-app/app-sidebar";
import { SidebarInsetTopbar } from "@/components/sidebar-app/inset-topbar";

// ---------------------------------------------------------------------------
// Paste-and-run app shell. peek="hover" floats the collapsed rail back out
// the moment the cursor reaches its edge or the trigger; pinning it open
// from that peek is seamless. State persists to the "sidebar_state" cookie —
// read it in a server layout for a flicker-free default:
//
//   const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
//   <SidebarProvider defaultOpen={defaultOpen}>…
// ---------------------------------------------------------------------------

export default function Page() {
  return (
    <SidebarProvider peek="hover">
      <AppSidebar />
      <SidebarInset>
        <SidebarInsetTopbar />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {/* your page */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
