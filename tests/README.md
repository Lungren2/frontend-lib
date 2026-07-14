# Tests

Cross-package installation, removal, upgrade, and fixture-project tests belong here. Component-level behavior remains colocated with registry source.

Lifecycle tests use temporary consumer projects and exercise both the engine API and the built CLI executable against the real registry. `fixtures/vite-react` is a minimal consumer project that installs source and completes a real Vite production build.
