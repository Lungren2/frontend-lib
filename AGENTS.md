# Frontend Lib Agent Guide

This file is the durable project contract. Update it when an architectural decision changes; do not let implementation drift silently from it.

## Product direction

Frontend Lib is an agent-friendly, source-owned React interface system and code-distribution platform. It keeps the useful shadcn/ui idea—CLI-managed source installed into the consumer's repository—but changes the authoring model and repository layout:

- Consumers use one browser-shaped namespace: `import { ui } from "..."` and `<ui.button />`.
- Namespace keys are lowercase because the API should resemble HTML. A JSX member expression such as `<ui.button />` is a React component, not an intrinsic element.
- Base UI is the behavioral substrate for supported interface primitives. Reuse its accessibility, focus, keyboard, state, portal, and composition behavior instead of rebuilding it.
- Native HTML remains appropriate for document structure. Do not force Base UI machinery under static headings, paragraphs, sections, or layout wrappers when it adds no behavior.
- Styling is owned by the design system through CSS custom properties, semantic classes, and `data-*` attributes.
- Installed source is editable application code. Never require consumers to modify `node_modules`.
- The system is designed for both human and coding-agent use: one import, a small vocabulary, predictable locations, and minimal implementation trivia.

The temporary internal package scope is `@frontend-lib/*`, and the future CLI command is provisionally `frontend-lib`. Rename both when the product name is chosen; do not treat these names as final branding.

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
apps/workbench/     Development surface and browser verification of registry source
packages/cli/       Terminal commands, prompts, and user-facing output
packages/engine/    Non-interactive planning and mutation engine
registry/           Canonical installable component source and component tests
tests/              Cross-package installation, removal, update, and fixture tests
registry.json       Source registry catalog
```

Boundary rules:

- `registry/` is the single source of truth for distributable UI. Do not keep a second implementation in the workbench or CLI.
- The workbench consumes `@frontend-lib/registry` so visual development exercises canonical source.
- `packages/cli` must remain a thin presentation layer over `packages/engine`.
- `packages/engine` must not prompt, print terminal UI, or depend on interactive command state. It should accept inputs and return deterministic plans/results.
- Cross-package fixture tests belong under `tests/`; component behavior tests stay beside registry components.
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

- Plain CSS is the default design-system implementation. Consumer projects may use Tailwind, but Tailwind is not a library runtime requirement.
- CSS custom properties own shared tokens. Semantic stylesheets own stable component recipes. React selects semantic props and attributes.
- Do not add CVA, Tailwind Variants, `tailwind-merge`, or large JavaScript class maps without a confirmed requirement.
- Keep tokens in `registry/src/styles/tokens.css`, component styling under `registry/src/styles/components/`, and broad-to-narrow imports in `registry/src/styles/index.css`.
- Use cascade layers to make ordering explicit.
- Every interactive component must cover keyboard focus, hover-capable devices, active state, disabled state, forced colors, and reduced motion where relevant.
- Prefer intrinsic sizing and logical properties. Verify long labels and narrow containers; do not assume fixed text lengths.
- Do not remove browser focus indication without an accessible replacement.
- Avoid baking icons into primitive APIs. Accept icon content through composition unless the design system later adopts an explicit icon dependency.

## Registry and installation model

The repository follows registry concepts from shadcn/ui but will own its engine and project shape.

Planned consumer state:

```text
src/interface/ui/   Installed source, organized by purpose
ui.config.json      Human-edited project configuration
ui.lock.json        Machine-owned file, hash, item, and dependency ownership state
```

The engine will eventually support:

- `init`: detect the project, write configuration, install the foundation, and configure imports/styles.
- `add`: resolve registry dependencies, preview a plan, install files/packages, regenerate namespace/style entry points, and update the lock.
- `remove`: consult ownership state, detect modified files, remove safe unshared files/packages, regenerate entry points, and update the lock.
- `configure`: plan and apply path, theme, or system migrations.
- `update`: compare registry versions and local hashes, show diffs, and apply selected changes.
- `doctor`: validate configuration, dependencies, namespace, styles, manifest ownership, and file drift.

Removal is a first-class differentiator. Never delete a file merely because its path resembles an installed component. Use explicit ownership plus recorded hashes, and stop or require confirmation when local edits make removal ambiguous.

Namespace and stylesheet entry points should be generated deterministically from installed registry items. Prefer regenerating files fully owned by the system over AST-editing consumer code. Do not add Babel, Recast, or ts-morph until a real mutation cannot be expressed safely without them.

## Current implementation state

- The repository is a pnpm workspace orchestrated with Turborepo.
- React and TypeScript are the only supported component targets for the initial version.
- `@base-ui/react` is the component behavior dependency.
- `ui.button` is the only component currently implemented.
- The button wraps Base UI Button, preserves its props and behavior, and exposes `primary`, `secondary`, and `ghost` variants plus `small` and `medium` sizes.
- The workbench displays all button variants and the disabled state.
- The CLI and engine packages contain boundary documentation only; command behavior has not been implemented.
- There is no published package, finalized brand, compatibility matrix, theme editor, documentation site, Storybook, multi-framework adapter, or icon dependency yet.

## Development commands

Use pnpm from the repository root:

```text
pnpm install          Install all workspace dependencies
pnpm dev              Run the workbench
pnpm typecheck        Type-check participating packages
pnpm test             Run automated tests
pnpm build            Build participating packages/apps
pnpm check            Run typecheck, tests, and build
pnpm format           Format repository files
pnpm format:check     Check formatting without writing
```

## Verification expectations

- A component change is incomplete until its types, behavior tests, production build, and real workbench rendering have been checked.
- Test semantic output and behavior, not implementation details. For example, verify that `ui.button` renders a native button, exposes design-system attributes, invokes handlers, and blocks disabled interaction.
- Register Testing Library cleanup globally so tests remain isolated.
- For visual component changes, check at least wide desktop and mobile-width workbench layouts, long content, keyboard focus, disabled behavior, overflow, and console errors.
- Stop development servers and browser sessions started during verification.
- Run `pnpm check` and `pnpm format:check` before handing off a completed change.

## Deliberate non-goals for now

- Do not reproduce shadcn/ui's repository scale, dependency count, or flat installed directory.
- Do not build multiple style systems, framework adapters, themes, component categories, or registry servers before the first workflow requires them.
- Do not add Storybook while the workbench is sufficient.
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
