# Symphony project contract

Read for every task with `AGENTS.md` and [shared workflow](common/workflow.md). The common modules are unchanged copies of the peer architects; this file and the local domain references apply them to Symphony.

## Owners and authority

- Symphony is a local-first Electron orchestration application. Preserve Angular Renderer → typed preload API → Electron Main → Orchestrator Utility Process. Domain/application policy stays framework- and provider-neutral; provider SDK types end at adapters.
- Apply [reuse-existing-patterns](../../reuse-existing-patterns/SKILL.md) before and after implementation. Locate the actual owner, closest complete example, contracts, consumers and tests; inspect installed public APIs before introducing an abstraction.
- Preserve concurrent user work. The skill grants no additional authority for external writes, messaging, commits, pushes, merges, deployments or releases. Before an authorized pull request, run the repository's local Ship-it review when available and resolve blocking findings; never claim a review that did not run.
- Distinguish maintaining Symphony itself from executing work against a configured target project: executable target-project work requires a Symphony-managed isolated worktree and lease. Never mutate the target's ordinary checkout, push a default branch or merge automatically. Analyzer production adapters remain read-only for target source.
- OmniRoute remains research-only material. Never add it as a dependency, runtime, provider, account, catalog source, gateway, default, integration, example or visible label. Symphony owns catalog/routing/failover policy; CLI adapters remain replaceable details. Inspect actual provider capabilities rather than inventing availability.

## Executable configuration and source conventions

- Resolve paths, dependencies, runners and versions from `package.json`, `nx.json`, `tsconfig.base.json`, ESLint boundaries, affected manifests and `yarn nx show project <name> --json`. Use Yarn and Nx; do not upgrade dependencies merely because a reference mentions newer tooling.
- TypeScript is strict ESM except the sandboxed Electron preload bundle, which is CommonJS. Follow the owning build's import-resolution contract; do not impose Archipel's NodeNext configuration on Symphony's Bundler setup.
- Keep contiguous imports inside `// #region Imports` / `// #endregion`. One public export owns its matching filename; interfaces use `I`, private fields use `_`, and class regions follow `Fields` → `Ctor` → `Properties` → `Methods`. Keep regions balanced and nonempty. Use constructor injection at application/provider boundaries, explicit public contracts and English multiline TSDoc with access tags.
- Prefer immutable values, typed identifiers, discriminated unions, exhaustive switches, `unknown` at untrusted inputs and explicit typed errors. Do not hide boundary failures with unchecked casts or leak raw provider types.
- Follow the existing owning interface/adapter contract, including application `I*Port` interfaces. The common Nest abstract-base/DI-token examples do not require replacing Symphony's ports or adding a parallel abstraction hierarchy.
- Read [instruction compliance](../../../../docs/architecture/instruction-compliance-refactoring.md) for the exact FLAMOX365 source-rule interpretation and legacy debt. `yarn instruction:check` enforces the current contract; legacy inconsistencies are not precedent.
- Keep every View in matching `.ts`, `.html` and `.scss` files. Source-adjacent non-E2E specs use the exact production basename; E2E journeys and repository-policy specs may remain behavior-named. Apply [frontend](frontend.md) and [testing](testing.md) at those boundaries.

## Completion and consequences

- Invoke [symphony-docs](../../symphony-docs/SKILL.md) and [symphony-technical-docs](../../symphony-technical-docs/SKILL.md) for implementation impact checks. Functional docs live under `docs/project`, technical contracts under feature-oriented `docs/architecture/<feature>/README.md`. Extend the existing owning documents and ADR index; distinguish implemented behavior, simulations, planned work and unverified integration.
- Apply [maintain-i18n](../../maintain-i18n/SKILL.md) when user-visible copy changes, [inspect-reference-ui](../../inspect-reference-ui/SKILL.md) for renderer work, and [manage-portable-skills](../../manage-portable-skills/SKILL.md) for skill/configuration work. These gates do not authorize unrelated edits or external actions.
- Inspect the combined diff for duplication, bypassed owners, state/lifecycle drift, changed consumers and generated output. Verify meaningful behavior through the lowest reliable layer, then run the repository-required checks appropriate to the change. Report actual checks and material prerequisites.
- `yarn verify` runs agent synchronization checks, instruction/UI/design checks, formatting, lint, typecheck, tests and builds. After building, `yarn e2e` exercises real Electron processes; `yarn forge:package` checks packaging. Do not claim those results from a focused check.
- Invoke [definition-of-done](../../definition-of-done/SKILL.md) only on explicit user request; its complete release-candidate sequence remains distinct from ordinary verification. German/EU legal review is also explicit-only. The architect does not authorize releases.
- Keep common modules and the shared entrypoint block unchanged. Compare peers through `.agents/scripts/sync_architect_core.py --peer <other-checkout> --check`; ordinary skill use remains independent of peer checkouts.
