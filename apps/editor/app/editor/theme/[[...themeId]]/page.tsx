// Derived from jnsahaj/tweakcn app/editor/theme/[[...themeId]]/page.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import Editor from "@/components/editor/editor";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frontend Lib Theme Editor",
  description:
    "Easily customize and preview your shadcn/ui theme with tweakcn. Modify colors, fonts, and styles in real-time.",
};

export default function EditorPage() {
  return <Editor themePromise={Promise.resolve(null)} />;
}
