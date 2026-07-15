# Frontend Lib

An agent-friendly, source-owned React interface system built on Base UI.

The repository is a pnpm monorepo containing the component registry, installation tooling, and a local theme editor. Run `pnpm dev` to open the editor.

The editor's `Frontend Lib` tab renders canonical registry source. Set
`FRONTEND_LIB_TARGET_CWD` to an initialized consumer project to review and apply a deterministic
theme plan through the engine.

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
