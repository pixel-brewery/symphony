## What changed

<!-- Describe the change and why it is needed. Link the issue it closes. -->

## Verification

<!-- Which gates did you run, and what did they report? -->

- [ ] `yarn verify`
- [ ] `yarn e2e` (or: not applicable to this change)
- [ ] `yarn forge:package` (or: not applicable to this change)

## Checklist

- [ ] The change respects the process boundaries in [docs/architecture/process-model.md](../blob/main/docs/architecture/process-model.md) — the renderer stays sandboxed, and Git, GitHub, SQLite, and agent execution stay in the orchestrator
- [ ] New or changed IPC methods update the request schema, the response schema, the `requestEnvelopeSchema` method enum, the orchestrator `dispatch` case, and the renderer caller
- [ ] Generated trees (`.codex/`, `.opencode/`, `.claude/skills/`, `.mcp.json`, `.agents/packages/`, `skills-lock.json`, `opencode.json`) were regenerated with `yarn agents:sync`, not edited by hand
- [ ] Affected documentation under `docs/architecture/` is updated
- [ ] `package.json` `version` is untouched — releases are versioned by the pipeline

## Renderer parity

<!-- Renderer changes only. Delete this section otherwise. -->

<!-- Which FLAMOX365 or Mosaik reference did you inspect, and was the decision
     Adopt, Adapt, or Differ? Record it in docs/architecture/frontend-reference-flamox.md.
     If you do not have access to the reference checkouts, say so here. -->

## Screenshots

<!-- User-visible changes only. Before and after. -->
