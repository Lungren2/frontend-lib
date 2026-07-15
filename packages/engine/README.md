# Engine

The non-interactive installation engine. It owns validated configuration and lock state, registry resolution, deterministic change planning, file hashes, dependency ownership, and safe item-level removal.

The public lifecycle operations are `initProject`, `addItems`, and `removeItems`.

Theme configuration uses an explicit two-phase API:

- `planTheme` validates the theme and target ownership, performs no writes, and returns a
  deterministic plan identity with its sorted changes.
- `applyTheme` rebuilds the plan, verifies the reviewed identity and current-file preconditions,
  then writes the owned `styles/theme.css`, generated stylesheet entry point, and lock through the
  engine's mutation path.
