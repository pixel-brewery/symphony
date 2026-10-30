# Symphony execution environment

Read for every task and delegation with `AGENTS.md` and [the project contract](project.md). Apply actual executable configuration instead of copying another product's service/database/browser assumptions.

## Runtime and resource ownership

- Resolve current processes, listeners, application paths and task owners before starting a needed runtime. Symphony has no NestJS API on port 3000 or PostgreSQL server on port 5432. Do not provision them from retained framework examples.
- Reuse the configured renderer/dev process when it is the actual subject; `package.json` defines the current development composition. Real-process acceptance uses the built Electron fixture. Do not substitute an alternate-port preview or browser-only copy for the boundary being verified.
- Coordinate heavy generation, builds, typechecks, test runs and shared outputs under one owner. Keep independent source/investigation work parallel where useful. Respect the actual configured runner limits, including the E2E suite's one worker; do not increase heaps/workers or change client settings to evade resource failures.
- Stop/restart only an identified task-owned process when necessary. Confirm child cleanup after failure and dispose helpers/watchers once no longer needed. Preserve unrelated processes, user tabs, unsaved work and data.

## State, fixtures and browser evidence

- Production application/workspace databases and credential homes are user state. Preserve them. Tests use their existing isolated temporary SQLite/configuration/workspace fixture policy and scoped cleanup; this explicit local rule supersedes retained shared-main-PostgreSQL examples.
- Inspect the actual test configuration before database or filesystem writes. Use synthetic data, test-only runtime adapters and exact test-owned paths; never reset user state, migrate a live database as fixture setup or print secrets.
- Executable work against a configured target project requires an isolated managed worktree and lease. A review/analyzer remains read-only for target source. This does not require moving ordinary Symphony skill/configuration edits into a fabricated target execution.
- Electron acceptance uses Playwright's actual Electron launch and isolated state. For a separately requested ordinary web-page inspection, respect the user's chosen browser/session and reuse a task tab where appropriate. Do not apply a Chrome-only rule to Electron or claim Electron verification from a browser screenshot.
- Integrate source changes before coordinated generation and verification. Repeat checks only for a new change, failure, unresolved concern or required gate. Report executed evidence and remaining prerequisites accurately.
