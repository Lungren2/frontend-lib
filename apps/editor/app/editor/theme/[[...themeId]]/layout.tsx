// Derived from jnsahaj/tweakcn app/editor/theme/[[...themeId]]/layout.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden">
      <main className="isolate flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
