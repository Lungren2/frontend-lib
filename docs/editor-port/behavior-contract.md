# Editor behavior contract

This Pass 2 contract records externally observable behavior, not an instruction
to redesign the editor. Pass 3 must begin by copying the relevant upstream code
from `vendor/tweakcn` into `apps/editor`, retaining required Apache-2.0 notices
and per-area provenance, and then adapting that copied source. It must not be a
from-scratch reconstruction that merely resembles the reference.

Upstream provenance for every copied area must record:

- repository: `https://github.com/jnsahaj/tweakcn`;
- upstream commit: `f89566aef1b6d71d0f72b998d16a5980bea10c98`;
- each upstream file or directory path copied;
- Apache-2.0 license and applicable attribution/copyright notices; and
- a clear summary of local modifications on changed upstream-derived files.

The first replica scope is the anonymous edit/preview/import/export/persist
workflow. Accounts, cloud-saved themes, publishing, sharing, billing, AI, OAuth,
community, and remote project mutation are outside this contract.

## Interface map

| Surface                       | Observable contract                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry and navigation          | `/editor/theme` opens the editor. Control selection is addressable through `tab` (`colors`, `typography`, `other`; AI is out of scope). Preview selection is addressable through `p` (`cards`, `dashboard`, `application`, `marketing`, plus mail, typography, and colors from More). Invalid values fall back safely. |
| Desktop layout                | Controls and preview are visible together in a horizontally resizable split. Editing does not navigate away or reset the selected preview.                                                                                                                                                                             |
| Narrow layout                 | Controls and Preview become explicit tabs; state is shared across both views.                                                                                                                                                                                                                                          |
| Theme selection               | Built-in presets can replace the current theme. Reset restores the current preset. Unsaved state is distinguishable through action availability.                                                                                                                                                                       |
| Theme model                   | One state contains `light` and `dark` style maps, `currentMode`, optional preset identity, and HSL adjustments. Common typography, radius, shadow geometry, letter spacing, and spacing changes apply to both modes; mode-specific colors remain separate.                                                             |
| Color controls                | Search filters grouped variables. Primary, secondary, accent, base, card, popover, muted, destructive, border/input/ring, chart, and sidebar variables are editable. Sidebar sync can copy and continue mirroring mapped base colors. A color change updates the active preview immediately.                           |
| Typography and other controls | Sans, serif, and mono families; letter spacing; hue/saturation/lightness adjustments; radius; spacing; and shadow color/opacity/blur/spread/offsets update the preview and generated output.                                                                                                                           |
| Mode/history actions          | Light/dark mode changes the edited map. Undo and redo traverse content changes; switching mode alone does not create a content-history entry. Reset returns to the selected preset.                                                                                                                                    |
| Preview                       | The selected example renders from the active style map. The primary token is observable both as a root CSS variable and as computed styling on preview content. Inspector/fullscreen are secondary; their presence must not block the core flow.                                                                       |
| CSS import                    | Import accepts `:root` and `.dark` custom-property blocks in supported color syntaxes and known non-color values. Empty/malformed content shows an actionable failure and does not corrupt the current theme. Unknown variables are ignored.                                                                           |
| Code/export                   | Code opens without authentication. Tailwind v4 defaults to `index.css` and supports `oklch`; Tailwind v3 exposes its applicable stylesheet/config output and excludes `oklch`. Copy writes the active output and changes the control to `Copied`.                                                                      |
| Persistence                   | Editor state survives reload in browser-local storage (`editor-storage`). Export preferences survive in `preferences-storage`. The replica may rename/version keys, but equivalent state and preferences must persist without a server.                                                                                |
| Keyboard behavior             | Standard Tab/Shift+Tab traversal reaches interactive controls, Enter/Space activates buttons and tabs, and Escape closes dialogs/popovers without losing committed edits. No upstream editor-global undo/redo shortcut was found; the replica must not claim one unless deliberately added and tested.                 |
| Failure isolation             | Anonymous operation never attempts an essential account/database request. Missing optional services do not break edit, preview, import, persistence, or export. Invalid saved state falls back safely and reports a user-actionable condition where relevant.                                                          |

The canonical token set is defined by `types/theme.ts`: semantic foreground and
background pairs; border/input/ring; five chart tokens; eight sidebar tokens;
three font families; radius; six shadow values; letter spacing; and optional
spacing, for both light and dark maps where applicable.

## Pass 3 acceptance gate

Implement these as browser tests against the copied-and-adapted `apps/editor`
source. The wording is intentionally executable-style. All scenarios are
required; “server started” is not a passing result.

```text
Scenario A01 — anonymous launch is isolated
  Given no account, database, billing, AI, OAuth, or analytics credentials
  When I open /editor/theme
  Then controls and a preview render
  And no essential request fails
  And the console has zero errors and zero warnings from the editor flow

Scenario A02 — token edit reaches state and preview
  Given the light theme and Cards preview
  When I set Primary/Background to #ff006e
  Then the root primary variable represents hsl(334.1176 100% 50%)
  And a primary preview element computes to rgb(255, 0, 110)
  And the page does not reload

Scenario A03 — edit persists locally
  Given A02 has completed
  When I reload /editor/theme
  Then Primary/Background is still #ff006e (allowing equivalent serialization)
  And the preview remains rgb(255, 0, 110)

Scenario A04 — Tailwind v4 export is deterministic and copyable
  Given the persisted #ff006e primary edit
  When I open Code and choose Tailwind v4, oklch, and index.css
  Then repeated generation returns byte-identical output
  And the primary output contains oklch(0.6406 0.2565 8.0691)
  When I activate Copy
  Then the clipboard equals the visible output
  And the control reports Copied

Scenario A05 — CSS import updates both modes and fails safely
  Given a valid :root/.dark custom-property input
  When I import it
  Then known light and dark values update their respective previews and export
  Given empty or malformed input
  When I attempt import
  Then an actionable validation failure is shown
  And the last valid theme remains intact

Scenario A06 — history, reset, and mode boundaries
  Given two committed token changes
  When I undo and redo
  Then the preview traverses those values in order
  When I switch light/dark mode
  Then no content-history entry is added
  When I reset
  Then the selected preset values are restored

Scenario A07 — responsive and keyboard operation
  Given desktop width
  Then controls and preview share a resizable split
  Given mobile width
  Then Controls and Preview tabs expose the same state
  When I operate the core flow with Tab, Shift+Tab, Enter, Space, and Escape
  Then focus remains visible, controls are operable, and dialogs dismiss safely

Scenario A08 — optional services remain outside the core
  Given all optional service credentials are absent
  When I complete A02 through A07 and reload once
  Then no account-theme POST is made
  And there are no hydration errors, resource 404s, invalid color-input warnings,
      Recharts warnings, or other console errors/warnings
```

Pass 3 is complete only when all scenarios pass on the independently bootable
replica, editor-only dependencies stay isolated from the CLI and registry, and
the provenance ledger demonstrates that the replica was copied and adapted from
the upstream subtree. Pass 4 integration is explicitly excluded from this gate:
the replica must not yet import Frontend Lib registry components or mutate files
through the engine.
