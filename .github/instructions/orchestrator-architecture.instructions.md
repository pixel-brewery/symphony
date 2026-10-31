---
applyTo: 'apps/orchestrator/**,libs/application/**,libs/domain/**,libs/providers/**,libs/persistence/**,libs/configuration/**'
name: 'Orchestrator Architecture'
description: 'Domain, application, provider, persistence, execution, workspace, and agent-runtime rules.'
---

# Orchestrator architecture

- Keep domain libraries framework- and provider-neutral. GitHub, Codex, SQLite, Electron, and Git types remain inside adapters.
- Use constructor injection, immutable values, typed identifiers, discriminated unions, exhaustive switches, explicit errors, and bounded retries.
- Compose execution context through typed layers; never concatenate arbitrary issue or repository text into shell commands.
- Restrict commands by executable, validated arguments, working root, environment allowlist, timeout, output bounds, and cancellation.
- Give each executable work item an isolated worktree and lease. Never mutate a user's ordinary checkout, share one worktree concurrently, push a default branch, or merge automatically.
- Keep Analyzer production adapters read-only with respect to target source files.
- Persist executions, attempts, events, selected skill versions, instruction hashes, locks, workspaces, and audit evidence needed for recovery.
