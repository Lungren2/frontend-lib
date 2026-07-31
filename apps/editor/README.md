<!-- Derived from jnsahaj/tweakcn README.md at f89566aef1b6d71d0f72b998d16a5980bea10c98. Modified by Frontend Lib; see THIRD_PARTY_NOTICES.md. -->

# Frontend Lib editor replica

This private app is a direct, modified port of the confirmed anonymous theme-editor workflow
from the vendored tweakcn reference. Pass 4 adds a canonical Frontend Lib preview and a guarded
server-side bridge to the engine; editor-specific dependencies remain isolated from the registry,
engine, and CLI.

From the repository root:

```text
pnpm --filter @frontend-lib/editor dev
pnpm --filter @frontend-lib/editor typecheck
pnpm --filter @frontend-lib/editor build
pnpm --filter @frontend-lib/editor test:e2e
$env:RUN_CODEX_SMOKE=1; pnpm --filter @frontend-lib/editor test:codex
```

Open `/editor/theme`. The editor stores local changes under the upstream-compatible
`editor-storage` browser key and exports generated theme CSS through the Code dialog.

## Frontend Lib preview and apply

The `Frontend Lib` preview tab renders the real `ui.button` export and the public registry
stylesheet. Its scoped adapter maps the current editor theme to Frontend Lib's `--ui-*` tokens,
so copied tweakcn preview fixtures remain available without being mistaken for registry source.

To enable plan/apply, point the editor server at an already initialized consumer project before
starting it:

```powershell
$env:FRONTEND_LIB_TARGET_CWD = (Resolve-Path C:\path\to\consumer).Path
pnpm --filter @frontend-lib/editor dev
```

The browser never supplies the target path. **Generate engine plan** performs no writes and shows
the sorted changes. **Apply engine plan** submits the same theme and reviewed plan identity; the
engine rejects stale plans or modified owned theme files before writing `styles/theme.css`, the
generated stylesheet entry point, and `ui.lock.json`.

The Generate tab is a streamed, multi-turn chat backed by `@openai/codex-sdk` in the TanStack
Start/Nitro server process. Sign in once with `codex login`, then run the editor on `localhost` or
another loopback address. Progress summaries and Codex's reply stream into the chat; only a
complete, validated theme is applied. The server keeps opaque chat mappings in memory for up to
one hour, so chats reset when the editor server restarts. **New chat** explicitly forgets the
active mapping.

The SDK launches Codex locally with read-only filesystem access in a disposable working directory
and a limited runtime environment. Model requests still use OpenAI and therefore require network
access. No API key, Codex credential, or internal Codex thread ID is stored in the browser or this
repository.

## Curated font cache

`public/fonts/google` holds a balanced, license-complete Google Fonts cache for a later
self-hosting pass. It favors variable WOFF2 and records upstream versions, URLs, hashes and the
Google Fonts repository commit in its generated manifest. The generated `curated.css` is
intentionally not imported yet, so vendoring does not silently change the editor's runtime font
behavior.

Refresh it with `pnpm --filter @frontend-lib/editor fonts:vendor`. The command reads the locally
ignored `apps/editor/.env.local`; never commit `GOOGLE_FONTS_API_KEY`.

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for source provenance and
[`../../docs/editor-port/behavior-contract.md`](../../docs/editor-port/behavior-contract.md) for
the acceptance contract.
