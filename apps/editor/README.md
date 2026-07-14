<!-- Derived from jnsahaj/tweakcn README.md at f89566aef1b6d71d0f72b998d16a5980bea10c98. Modified by Frontend Lib; see THIRD_PARTY_NOTICES.md. -->

# Frontend Lib editor replica

This private app is a direct, modified port of the confirmed anonymous theme-editor workflow
from the vendored tweakcn reference. It is intentionally independent of Frontend Lib's registry,
engine, CLI, and workbench during Pass 3.

From the repository root:

```text
pnpm --filter @frontend-lib/editor dev
pnpm --filter @frontend-lib/editor typecheck
pnpm --filter @frontend-lib/editor build
pnpm --filter @frontend-lib/editor test:e2e
```

Open `/editor/theme`. The editor stores local changes under the upstream-compatible
`editor-storage` browser key and exports generated theme CSS through the Code dialog.

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for source provenance and
[`../../docs/editor-port/behavior-contract.md`](../../docs/editor-port/behavior-contract.md) for
the acceptance contract.
