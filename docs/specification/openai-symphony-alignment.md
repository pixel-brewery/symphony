# OpenAI Symphony alignment

The architecture was researched against the official [Symphony service specification](https://github.com/openai/symphony/blob/main/SPEC.md) and the experimental Elixir reference implementation. The TypeScript application is an independent implementation.

## Adopted

- A single authoritative coordinator owns claims, dispatch, retries, reconciliation, and concurrency.
- Tracker records are normalized before entering orchestration.
- Work uses deterministic per-item isolated workspaces.
- Polling, bounded concurrency, exponential backoff, cancellation, and stale-run recovery are explicit.
- Workflow policy is distinct from coordination and integration code.
- Runtime events are structured; human-readable summaries never drive decisions.
- Agent credentials and tracker credentials are mediated by the host and excluded from child environments unless explicitly allowlisted.

## Extended

- Durable SQLite records supplement in-memory coordination for desktop restart recovery, auditability, leases, attempts, and usage.
- Workflows are versioned domain objects with stages and transitions, not one repository Markdown prompt.
- Deterministic hierarchical skills and formal context composition sit between stage policy and agent execution.
- Work-item tracking is a provider capability. Azure DevOps Work Items is the first production adapter; GitHub is independently bound for source control and Actions.
- A secure Electron/Angular operator surface is a primary capability rather than an optional HTTP dashboard.
- Workspace acquisition is a typed Git/worktree provider with retention and leases instead of arbitrary lifecycle shell hooks.

## Implemented differently

- Renderer-to-runtime communication uses Zod-validated Electron IPC and Utility Process messages. The optional Symphony HTTP/REST extension is omitted.
- The initial Codex adapter uses `codex exec --json` because it is the documented non-interactive automation interface. An app-server/SDK adapter remains possible behind the same runtime port.
- Tracker mutations are background-service-owned typed operations. Agent output is validated data and cannot perform unrestricted provider mutations.
- Internal workflow states are explicit exhaustive values and are mapped to provider configuration; provider strings are not orchestration state.
- Commands are allowlisted typed definitions, never arbitrary `WORKFLOW.md` shell fragments.

## Intentionally omitted from the bootstrap

- Linear and the Elixir implementation's other tracker adapters.
- Phoenix/LiveView and all HTTP observability endpoints.
- Arbitrary repository hooks.
- Multi-host worker placement and SSH workers.
- Multiple continuation turns in a persistent app-server thread.
- Automatic completion, merging, or deployment.

These omissions are product-boundary decisions, not claims that the corresponding Symphony concepts lack value.
