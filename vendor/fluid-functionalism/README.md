# Fluid Functionalism upstream reference

Original repository: https://github.com/mickadesign/fluid-functionalism
Pinned commit: `bf9ece46728035afef54feef6ac67e1f413cc0b0`
Pinned tree: `06dd24ae3b4a66d320a75b4fc820c4a6a357a5de`
License: MIT, Copyright (c) 2026 Micka Touillaud. See `LICENSE`.

This directory preserves **verbatim** upstream files so Interface can adapt the design and interaction behavior without losing provenance. The Git blob SHA of each copied source file matches the source at the pinned commit.

Included:
- `registry/base/`: the Base UI implementation of all upstream components that have a choice of Base UI or Radix;
- `registry/default/`: shared components, hooks, and support code;
- `registry/blocks/`: upstream composed examples, as design reference;
- `app/globals.css` and `registry.json`: the token definitions and registry metadata;
- motion guidance and the upstream design skill/reference.

Excluded: `registry/radix/`, the upstream Next.js documentation/demo app, generated registry output, test fixtures, and its dependency installation tree. Interface uses Base UI as its one behavioral foundation. This directory is **not** included in the pnpm workspace and is not an alternative runtime or a second component registry.

Adapted production source remains in `registry/src/`. The existing `packages/engine` owns source installation, namespace generation, ownership tracking, updates, and removal. The local editor under `apps/editor/` remains the theme-editing and preview application.

When adapting an upstream component:
1. Trace its source and design dependencies to this exact revision.
2. Copy the behavior into `registry/src/` under the actual Interface ownership path.
3. Expose it through the generated lowercase `ui.*` namespace and semantic `data-ui` attributes.
4. Use one canonical production implementation; do not ship Base UI and Radix modes.
5. Preserve attribution and note meaningful changes.
6. Verify component behavior, theme preview, engine installation, and consumer build.

Do not edit these pinned source files. A future upstream refresh requires a separately reviewed revision update.
