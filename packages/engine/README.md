# Engine

The non-interactive installation engine. It owns validated configuration and lock state, registry resolution, deterministic change planning, file hashes, dependency ownership, and safe item-level removal.

The current public operations are `initProject`, `addItems`, and `removeItems`.
