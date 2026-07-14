# Frontend Lib

An agent-friendly, source-owned React interface system built on Base UI.

The repository is a pnpm monorepo containing the component registry, installation tooling, and a Vite workbench that exercises the same source consumers receive. Run `pnpm dev` to open the local component preview and compose CLI install commands.

## Development

```text
pnpm install
pnpm check
pnpm dev
```

The current CLI supports the first complete component lifecycle:

```text
frontend-lib init --registry <path> [--cwd <path>] [--dry-run]
frontend-lib add button --registry <path> [--cwd <path>] [--dry-run]
frontend-lib remove button [--cwd <path>] [--dry-run]
```
