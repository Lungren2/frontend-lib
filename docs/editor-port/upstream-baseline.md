# Upstream editor baseline

This is the Pass 1 runbook and evidence record for the unmodified `vendor/tweakcn`
subtree. The reference is [`jnsahaj/tweakcn`](https://github.com/jnsahaj/tweakcn)
at upstream commit `f89566aef1b6d71d0f72b998d16a5980bea10c98`. It is Apache-2.0 licensed;
the subtree contains `LICENSE` and no `NOTICE` file. The baseline run left the
subtree tracked-clean.

## Isolated launch

Run the reference as its own Next application. It is outside the root pnpm
workspace, and the install required `--ignore-workspace`.

```powershell
Set-Location D:\dev\frontend-lib\vendor\tweakcn
Copy-Item .env.example .env.local
# Keep BASE_URL=http://localhost:3000. Add real service credentials only when
# deliberately testing the corresponding non-core service.
pnpm install --ignore-workspace --frozen-lockfile --ignore-scripts
pnpm --ignore-workspace run dev --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000/editor/theme`. Stop the server with `Ctrl+C` after
verification. Do not use root workspace scripts for this application.

`.env.local` is local-only and is ignored by `vendor/tweakcn/.gitignore`. Never
commit it or put credentials in a workspace file. These checks must remain
empty/successful after a baseline run:

```powershell
git check-ignore vendor/tweakcn/.env.local
git status --short -- vendor/tweakcn
```

The example environment declares `BASE_URL`, `DATABASE_URL`, Better Auth and
GitHub/Google OAuth values, AI provider keys, and a Google Fonts key. The
anonymous core editor does not need working credentials. They are service
contracts for account-backed saved themes, authentication, AI generation, and
remote font discovery. Other source-only optional integrations include Polar
billing and PostHog. A global Google Fonts stylesheet is also requested by the
layout. Do not broaden Pass 3 to stand up these services.

## Route and dependency boundary

| Area                                           | Status for the anonymous editor      | Source boundary                                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Editor route and responsive shell              | Essential                            | `app/editor/theme/[[...themeId]]/`, `components/editor/editor.tsx`                                                                                                                         |
| Theme state, defaults, history, preferences    | Essential                            | `config/theme.ts`, `types/editor.ts`, `types/theme.ts`, `store/editor-store.ts`, `store/preferences-store.ts`                                                                              |
| Color/token editing and conversion             | Essential                            | `components/editor/colors-tab-content.tsx`, `components/editor/color-picker.tsx`, `utils/color-converter.ts`, `utils/apply-theme.ts`                                                       |
| Preview surfaces                               | Essential                            | `components/editor/theme-preview-panel.tsx`, `components/examples/`, supporting UI primitives                                                                                              |
| CSS import and generated code copy             | Essential                            | `components/editor/css-import-dialog.tsx`, `utils/parse-css-input.ts`, `components/editor/code-panel.tsx`, `utils/theme-style-generator.ts`                                                |
| Built-in presets                               | Essential                            | `components/editor/theme-preset-select.tsx`, `utils/theme-presets.ts`, `store/theme-preset-store.ts`                                                                                       |
| Hosted custom-site preview                     | Secondary external integration       | `components/dynamic-website-preview.tsx`, `hooks/use-iframe-theme-injector.ts`, `public/live-preview*.js`; hard-coded hosted embed script/origin contract, excluded from the local replica |
| Saved themes, share, publish, named theme URLs | Optional account boundary            | `actions/themes.ts`, `hooks/themes/`, `db/`, auth/session code                                                                                                                             |
| Accounts, dashboard, settings, community       | Unrelated product surface            | `app/(auth)/`, `app/dashboard/`, `app/settings/`, `app/community/`                                                                                                                         |
| Billing                                        | Unrelated product surface            | `app/pricing/`, `app/success/`, Polar actions/routes and subscription code                                                                                                                 |
| AI theme generation                            | Unrelated to the confirmed core flow | `app/ai/`, AI API routes, `components/editor/ai/`, AI stores/hooks                                                                                                                         |
| OAuth/API/Figma/public theme pages             | Unrelated product surface            | `app/oauth/`, `app/api/oauth/`, `app/api/v1/`, `app/figma/`, `app/themes/`                                                                                                                 |

The header and action bar currently expose some optional boundaries inside the
editor shell. In particular, `ActionBarButtons` calls `useThemesData()` even for
an anonymous visitor, which invokes account-backed `getThemes`. That coupling is
not required for local edit, preview, reload persistence, or code export.

The upstream Custom preview is also not an independent local preview. It loads a
hard-coded `https://tweakcn.com/live-preview.min.js` embed and uses cross-origin
message handling whose copied script allowlists upstream and one upstream
localhost origin. It is a hosted integration rather than part of the proven
local token/preview/export flow, so Pass 3 removes that tab and its support files.

## Functional evidence

Observed locally on 2026-07-14 against the unmodified subtree:

1. `/editor/theme` rendered the editor controls and component preview.
2. Editing the light Primary/Background token to `#ff006e` produced
   `hsl(334.1176 100% 50%)` at the root `--primary` variable and
   `rgb(255, 0, 110)` in the preview.
3. Reloading retained the edit from local persistence.
4. The Code flow, with Tailwind v4 and `oklch`, generated `index.css` containing
   `oklch(0.6406 0.2565 8.0691)` for the changed primary value.
5. Copy completed and the control reached its `Copied` state.

The local, non-committed screenshot is
`output/playwright/vendor-baseline/.playwright-cli/page-2026-07-14T06-32-48-390Z.png`.
It is evidence output only; do not copy it into the application or docs.

## Blockers and baseline disposition

The core anonymous workflow is functionally proven, but the upstream run did
**not** satisfy the stricter “browser reports no errors” criterion. The observed
browser/request noise was:

- an anonymous `getThemes` server-action `POST` returning 500;
- a hydration mismatch;
- five avatar resource 404s;
- invalid color-input warnings; and
- Recharts warnings.

A running Next server alone was not counted as success; token mutation, preview,
reload persistence, generated export, and clipboard completion were all checked.
The failures above are explicit upstream blockers, not accepted replica
behavior. Pass 3 may use this baseline as the functional reference only if its
anonymous-core acceptance run removes or isolates every one of these failures.

## Source evidence index

- Scripts and dependency surface: `vendor/tweakcn/package.json`
- Environment example and ignore rule: `vendor/tweakcn/.env.example`,
  `vendor/tweakcn/.gitignore`
- Route composition: `vendor/tweakcn/app/editor/theme/[[...themeId]]/page.tsx`,
  `layout.tsx`
- Local persistence: `vendor/tweakcn/store/editor-store.ts`,
  `vendor/tweakcn/store/preferences-store.ts`
- Account request coupling: `vendor/tweakcn/components/editor/action-bar/components/action-bar-buttons.tsx`,
  `vendor/tweakcn/hooks/themes/use-themes-data.ts`, `vendor/tweakcn/actions/themes.ts`
- Export implementation: `vendor/tweakcn/components/editor/code-panel.tsx`,
  `vendor/tweakcn/utils/theme-style-generator.ts`
- Hosted custom preview: `vendor/tweakcn/components/dynamic-website-preview.tsx`,
  `vendor/tweakcn/hooks/use-iframe-theme-injector.ts`,
  `vendor/tweakcn/public/live-preview.js`
