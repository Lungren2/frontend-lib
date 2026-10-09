# Frontend Lib Agent Guide

This file is the durable project contract. Update it when an architectural decision changes; do not let implementation drift silently from it.

## Product direction

Frontend Lib is an agent-friendly, source-owned React interface system and code-distribution platform. It keeps the useful shadcn/ui idea—CLI-managed source installed into the consumer's repository—but changes the authoring model and repository layout:

- Consumers use one browser-shaped namespace: `import { ui } from "..."` and `<ui.button />`.
- Namespace keys are lowercase because the API should resemble HTML. A JSX member expression such as `<ui.button />` is a React component, not an intrinsic element.
- Base UI is the behavioral substrate for supported interface primitives. Reuse its accessibility, focus, keyboard, state, portal, and composition behavior instead of rebuilding it.
- Native HTML remains appropriate for document structure. Do not force Base UI machinery under static headings, paragraphs, sections, or layout wrappers when it adds no behavior.
- Fluid Functionalism supplies the Base UI component and interaction baseline. Preserve its Tailwind CSS v4 utility recipes and its design tokens; `data-ui` and `data-*` attributes carry Interface identity and semantic state.
- Installed source is editable application code. Never require consumers to modify `node_modules`.
- The system is designed for both human and coding-agent use: one import, a small vocabulary, predictable locations, and minimal implementation trivia.

The temporary internal package scope is `@frontend-lib/*`, and the future CLI command is provisionally `frontend-lib`. Rename both when the product name is chosen; do not treat these names as final branding.

## Fluid Functionalism adoption

- Source baseline: `mickadesign/fluid-functionalism` commit `bf9ece46728035afef54feef6ac67e1f413cc0b0`, tree `06dd24ae3b4a66d320a75b4fc820c4a6a357a5de`. Original files and MIT license live under `vendor/fluid-functionalism/`; keep the pinned reference unchanged.
- Reuse the upstream Base UI variants and shared motion, size, typography, surfaces, and hover behavior. Do not design replacement components from scratch when a relevant upstream component exists.
- `registry/src/` remains the only production component implementation. Adapt upstream code into its Interface owner path with `data-ui`, semantic attributes, and the generated `ui.*` namespace.
- Only Base UI components are valid. Do not add Radix compatibility, side-by-side implementations, or runtime feature modes.
- Tailwind CSS v4 is the styling system for Interface components and consumer installations. Keep Fluid Functionalism's utility classes and `cva`/`cn` variant recipes instead of translating them into a parallel semantic stylesheet. Consumer setup must configure Tailwind to scan installed source reliably.
- Wire design tokens through the editor's existing theme adapter and the engine's validated `planTheme`/`applyTheme`. The editor preview must render the actual `registry/src/` component and same computed tokens used by consumers.
- Preserve source attribution and MIT licensing in adapted files. Check accessibility, keyboard behavior, reduced motion, focus, and consumer build as each component is ported.

## Working principles

- Write less code. Make the smallest change that solves a confirmed problem.
- Before implementation, state the interpretation, material ambiguity, and unnecessary scope. Proceed directly when the request is straightforward and low risk.
- Inspect the actual repository and trace the real code path before making behavior or architecture claims.
- When a regression appears, stop editing, reproduce it, identify the cause, then apply the smallest fix and add or strengthen the verification seam.
- Do not create abstractions, directories, configuration, variants, or dependencies merely because they may be useful later.
- Preserve consumer-owned changes. Installation and upgrade operations must preview consequential overwrites.
- Product frontends should omit nonessential headings, explanatory copy, and labels while retaining text required for safe operation and accessibility.
- Prefer dense, scannable tables over repeated cards for comparable desktop records. Responsive behavior must remain usable on narrow screens.

## Repository boundaries

```text
apps/editor/        Private local theme editor and preview surface
packages/cli/       Terminal commands, prompts, and user-facing output
packages/engine/    Non-interactive planning and mutation engine
registry/           Canonical installable component source and component tests
tests/              Cross-package installation, removal, update, and fixture tests
vendor/tweakcn/     Unmodified upstream editor reference, outside the workspace
vendor/fluid-functionalism/ Pinned Base UI component/design source, outside the workspace
registry.json       Source registry catalog
```

Boundary rules:

- `registry/` is the single source of truth for distributable UI. Do not keep a second implementation in the editor or CLI.
- The editor consumes the registry's public component and stylesheet exports for its canonical preview. Its loopback-only server route may call the engine's plan/apply API for one server-configured consumer target; browser code must never mutate files or choose the target path.
- `packages/cli` must remain a thin presentation layer over `packages/engine`.
- `packages/engine` must not prompt, print terminal UI, or depend on interactive command state. It should accept inputs and return deterministic plans/results.
- Cross-package fixture tests belong under `tests/`; component behavior tests stay beside registry components.
- Keep `vendor/tweakcn` outside the root workspace and do not make Frontend Lib packages depend on it directly. Agents may port source from it into a local editor implementation when that is the shortest path; retain applicable Apache-2.0 license, copyright, and attribution notices, record the upstream path and commit for copied areas, and mark modified upstream-derived files clearly.
- Create a category directory only when its first real item exists. Do not prebuild an empty component taxonomy.
- Keep the structure shallow and purpose-based. Never introduce a flat `components/ui` dump or an empty `components` wrapper.
- Keep a simple component in one source file. Split types, styles, parts, or tests only when their size or ownership justifies it.

## Public component API

The preferred consumer API is:

```tsx
import { ui } from "@/interface/ui";

<ui.button variant="primary">Save</ui.button>;
```

Rules:

- Add every installed public primitive to the single generated `ui` namespace.
- Do not assemble competing or feature-local namespace objects.
- Product screens should not import Base UI directly. Wrap it in the local interface system.
- Named exports may exist as advanced, testing, or package-level escape hatches, but `ui.*` is the documented golden path.
- Use named React component functions so React DevTools remains legible.
- Preserve the underlying Base UI and native element props unless deliberately narrowing an unsafe API.
- Keep props semantic and small. Do not create large variant matrices or prop APIs that merely move CSS decisions into TypeScript.
- Use `data-ui` for component identity and focused attributes such as `data-variant` and `data-size` for design intent. Retain Base UI's state attributes.
- Do not promise a simplified composite API until its behavior and escape hatches are clear. Avoid fragile child inspection and callable components with large static namespaces unless a demonstrated need justifies them.

## Styling contract

- Tailwind CSS v4 is the single styling implementation for installed components. It runs during the consumer build to generate ordinary CSS; do not describe it as a browser runtime dependency or add a plain-CSS compatibility mode.
- CSS custom properties and Tailwind v4 `@theme` declarations own design values. React/TSX owns the upstream utility recipes and finite variant selections. `data-ui` and focused state attributes remain part of Interface's public element contract.
- Preserve upstream `class-variance-authority`, `cn` (`clsx` and `tailwind-merge`), and established finite component variants where used. Avoid a second variant system, dynamic utility-name construction, and new abstractions that duplicate upstream recipes.
- Use a Tailwind v4 entry stylesheet and `@theme` for shared tokens. Keep reset/base rules and unsupported CSS mechanics in the smallest owning stylesheet. Do not move utility-expressible component styling out of TSX merely because its class string is long.
- Preserve Tailwind's native `theme`, `base`, `components`, `utilities` cascade order. The editor and consumer-generated stylesheets must honor the same token contract and actual Tailwind build output.
- Every interactive component must cover keyboard focus, hover-capable devices, active state, disabled state, forced colors, and reduced motion where relevant.
- Prefer intrinsic sizing and logical properties. Verify long labels and narrow containers; do not assume fixed text lengths.
- Do not remove browser focus indication without an accessible replacement.
- Preserve Fluid Functionalism's icon role/slot API when adapting components. Keep default icon dependencies explicit and retain the upstream ability to substitute icons through a provider when applicable.

ACF's `tailwind-css-architect` skill is the Tailwind policy reference. Its `responsive-css-architect` companion owns layout constraints and CSS organization, not a mandate to convert utility recipes into plain CSS. Do not introduce ACF-specific Tailwind plugins unless an adopted component or an approved layout actually requires them.

## Registry and installation model

The repository follows registry concepts from shadcn/ui but will own its engine and project shape.

Planned consumer state:

```text
src/interface/ui/   Installed source, organized by purpose
ui.config.json      Human-edited project configuration
ui.lock.json        Machine-owned file, hash, item, and dependency ownership state
```

The engine currently supports:

- `init`: detect the project, write configuration, install the foundation, and configure imports/styles.
- `add`: resolve registry dependencies, preview a plan, install files/packages, regenerate namespace/style entry points, and update the lock.
- `remove`: consult ownership state, detect modified files, remove safe unshared files/packages, regenerate entry points, and update the lock.

Later passes may add:

- `configure`: plan and apply path, theme, or system migrations.
- `update`: compare registry versions and local hashes, show diffs, and apply selected changes.
- `doctor`: validate configuration, dependencies, namespace, styles, manifest ownership, and file drift.

Removal is a first-class differentiator. Never delete a file merely because its path resembles an installed component. Use explicit ownership plus recorded hashes. Removal is atomic per item: if any owned file was modified, retain the entire item, its generated references, and its dependency ownership, and return a warning.

Namespace and stylesheet entry points should be generated deterministically from installed registry items. Prefer regenerating files fully owned by the system over AST-editing consumer code. Do not add Babel, Recast, or ts-morph until a real mutation cannot be expressed safely without them.

## Current implementation state

- The repository is a pnpm workspace orchestrated with Turborepo.
- React and TypeScript are the only supported component targets for the initial version.
- `@base-ui/react` is the component behavior dependency.
- The existing `ui.button` is still the earlier Base UI-backed implementation. The Fluid Functionalism button adaptation remains pending; its Tailwind/CVA recipe must be ported without converting it into a new hand-written CSS implementation.
- The engine implements validated `ui.config.json` and `ui.lock.json` state, registry dependency resolution, deterministic planning, SHA-256 ownership hashes, generated namespace/styles, managed package dependencies, dry runs, idempotent addition, and safe item-level removal.
- The engine also owns two-phase theme configuration: `planTheme` hashes sorted writes and file preconditions without mutating, while `applyTheme` rejects stale plans before writing an owned `styles/theme.css` and regenerating the layered stylesheet entry point.
- The CLI implements thin `init`, `add`, and `remove` commands over the engine. `init` and `add` require a registry path; all three commands accept `--cwd` and `--dry-run`.
- Cross-package lifecycle tests exercise temporary projects through both the engine API and the built CLI executable. A Vite fixture installs the source and completes a production build.
- The private editor runs on TanStack Start with Vite and Nitro. Its route tree owns the editor page and loopback-only server APIs; production serving binds to loopback by default.
- The private local theme editor is a traceable tweakcn derivative with token editing, live previews, import/export, local persistence, and a loopback-only streamed, multi-turn Codex SDK theme chat. Its server retains opaque in-memory chat mappings and applies only validated theme payloads.
- The editor's Frontend Lib tab currently renders the original registry `ui.button` and public stylesheet in one scoped preview. A shared adapter maps editor state to `--ui-*` preview values and the engine theme contract. Its integration with Fluid Functionalism's Tailwind v4 tokens and component recipes is pending. Plan/apply uses only `FRONTEND_LIB_TARGET_CWD` from the server environment and never accepts a browser-supplied filesystem path.
- The editor has a curated, license-complete Google Fonts cache with 15 preset-relevant families, 14 variable families, 29 WOFF2 files, generated `@font-face` CSS, source hashes and an offline integrity check. The CSS is deliberately not imported yet; runtime self-hosting remains a separate adaptation.
- There is no published package, finalized brand, compatibility matrix, documentation site, Storybook, multi-framework adapter, or icon dependency yet.

## Development commands

Use pnpm from the repository root:

```text
pnpm install          Install all workspace dependencies
pnpm dev              Run the editor
pnpm typecheck        Type-check participating packages
pnpm test             Run automated tests
pnpm build            Build participating packages/apps
pnpm check            Run typecheck, tests, and build
pnpm format           Format repository files
pnpm format:check     Check formatting without writing
```

## Verification expectations

- A component change is incomplete until its types, behavior tests, and production consumer build have been checked.
- Test semantic output and behavior, not implementation details. For example, verify that `ui.button` renders a native button, exposes design-system attributes, invokes handlers, and blocks disabled interaction.
- Register Testing Library cleanup globally so tests remain isolated.
- For visual component changes, verify wide desktop and mobile-width layouts, long content, keyboard focus, disabled behavior, overflow, and console errors in an appropriate consumer surface.
- Stop development servers and browser sessions started during verification.
- Run `pnpm check` and `pnpm format:check` before handing off a completed change.

## Deliberate non-goals for now

- Do not reproduce shadcn/ui's repository scale, dependency count, or flat installed directory.
- Do not build multiple style systems, framework adapters, themes, component categories, or registry servers before the first workflow requires them.
- Do not add Storybook without a confirmed component-development requirement.
- Do not introduce a compiler transform or custom JSX runtime for native-looking tags.
- Do not make the single `ui` namespace the only possible package export; retain room for named/subpath exports where bundling, testing, or framework boundaries require them.
- Do not claim accessibility merely because Base UI is present. Preserve labeling and structure, and verify the wrapper's actual output and interaction.

## Model routing when delegation is explicitly requested

- Default bounded implementation: `gpt-5.6-sol [medium]` or `gpt-5.6-terra [high]`.
- Serious production implementation and closing passes: `gpt-5.6-sol [high]`.
- Cheap scoped workers: `gpt-5.6-terra [medium/high]`.
- Repository exploration and tool-heavy investigation: `gpt-5.6-luna [xhigh]`.
- Open-ended hard reasoning: `gpt-5.6-luna [max]`.
- Treat GPT-5.5 as a legacy comparison, not the default lane.

Do not delegate or spawn sub-agents unless the user explicitly asks for delegation or parallel agent work.
