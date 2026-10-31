# Architecture decision records

## ADR-001: Electron Utility Process boundary

**Status:** Accepted. Electron Main launches and supervises one Node-enabled Utility Process after `app.whenReady()`. The renderer communicates through a sandboxed preload and explicit Zod contracts. This follows Electron's process model while keeping long-running orchestration out of Main.

## ADR-002: SQLite driver

**Status:** Accepted for bootstrap, review at Electron/Node upgrades. Use the built-in `node:sqlite` `DatabaseSync` API inside the Utility Process. Electron 43 embeds Node 24.17, so the API exists without shipping or rebuilding a native addon. This avoids Electron ABI drift, Forge unpack rules, macOS arm64 compilation, and Windows x64 build-tool prerequisites. Migrations are ordered SQL resources applied transactionally and recorded in `schema_migrations`.

The tradeoff is that Node 24 documents `node:sqlite` at stability 1.2 (release candidate). The persistence port and repository tests isolate this choice. Re-evaluate before public release; replace it if Electron's embedded Node removes/changes the API or production evidence favors a mature native driver. `better-sqlite3` was rejected for the bootstrap because it adds per-Electron-ABI rebuild and packaging obligations. ORM adoption was rejected because migrations and queries are small, explicit, and benefit from direct transaction control.

## ADR-003: Codex CLI first adapter

**Status:** Accepted; implementation amended by the Synapse extraction. The native Codex driver retains `codex exec --json`, read-only Analyzer sandboxing, explicit cwd, cancellation, output bounds and controlled environments. `SynapseAgentRuntime` retains business prompts while `SynapseAiService` composes isolated native Codex, Claude Code and OpenCode packages. Complete continuation references preserve profile/candidate/account-generation ownership across restart. Symphony selects the shared runtime's maximum supported native timer window (2147483647 milliseconds, about 24.8 days) and accepts shorter explicit request deadlines. This preserves ordinary long-running turns while adding a finite ceiling to the original unlimited-duration assumption; the library's general thirty-minute default is overridden by the host. Only explicitly repeatable reads may fail over automatically; implementation is never replayed after a started attempt. Host persistence and cancellation failures remain terminal. See [Provider model](../architecture/provider-model.md).

## ADR-004: Pinned version matrix

**Status:** Accepted on 2026-08-07.

| Concern                  | Version        | Evidence and compatibility                                                                  |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------- |
| Node development runtime | 26.0.0 minimum | Installed runtime and Angular 22-supported range. Electron embeds its own Node runtime.     |
| Yarn Berry               | 4.10.3         | Proven FLAMOX365 workspace version; node-modules linker supports Forge and Angular tooling. |
| Nx / Angular plugin      | 23.1.1         | Current registry stable; Nx matrix supports Angular 22 from 23.1.0.                         |
| Angular                  | 22.1.0         | Same proven FLAMOX365 version; requires TypeScript 6.0.x.                                   |
| TypeScript               | 6.0.3          | Angular compiler peer range is `>=6.0 <6.1`.                                                |
| Electron                 | 43.3.0         | Current stable registry release; Electron 43 uses Node 24.17 or later patch levels.         |
| Electron Forge           | 7.11.2         | Current stable registry release and compatible with supported Node versions.                |
| Mosaik                   | 0.1.178        | Published Flow API with case-correct core imports, matched Angular wrappers and themes.     |
| Markdowner core          | 0.1.175        | Correctly cased module paths support the shared Markdown dialect on Linux and macOS.        |
| Zod                      | 4.4.3          | Current stable registry release.                                                            |
| Vitest                   | 4.1.10         | Current stable and FLAMOX365-proven version; supports Vite 8.                               |
| Playwright               | 1.62.1         | Current stable and FLAMOX365-proven version.                                                |

Versions are exact in `package.json`; transitive lock data is committed.

## ADR-005: ESM and preload exception

**Status:** Accepted. Main, orchestrator, libraries, Forge config, and Angular code use ESM. The preload is bundled as CommonJS because sandboxed Electron preload scripts have a restricted module environment; it exposes no Node primitive and only named API methods.

## ADR-006: Local mobile companion service

**Status:** Accepted. Phase-1 mobile access is delivered entirely by Symphony Desktop on the selected private local network. Symphony packages a separate Nx Angular mobile application and controls an isolated local gateway, QR pairing, device authorization, lifecycle, and revocation. The mobile application composes shared frontend feature libraries through the existing PresenterView/ViewPresenter architecture and uses Mosaik Page, TabStrip, Expander, List, input, and state components rather than a second product UI system. No hosted site, cloud relay, public ingress, or native mobile application belongs to phase 1. The gateway must remain outside the renderer and Electron Main application policy, expose only a dedicated versioned and Zod-validated mobile contract, and preserve workspace authorization boundaries.

The accepted exception replaces the repository's blanket internal-HTTP-server prohibition only for this isolated gateway. Phase 1 uses plain HTTP and WebSocket only as a development PoC on an explicitly trusted local network; it is not approved for sensitive production data until a separate transport-security decision is accepted. The complete scope, user journey, process ownership, risks, and acceptance criteria are documented in [Mobile companion phase 1](../architecture/mobile-companion-phase-1.md).

## ADR-007: Main-owned immutable desktop updates

**Status:** Accepted. Electron Main owns update checks, channel selection, the verified in-app installer download (size and SHA-256 checked against the installer manifest, progress published as typed update state), and native installation. It checks the verified-release-derived installer channel before falling back to Electron's built-in updater, while the renderer receives only typed state and named URL-free intents. The Utility Process remains the owner of durable execution pause/cancel semantics used during a safe native update restart. Every successful `main` commit produces one immutable release and advances the installer pointers for Stable and Canary only after the complete artifact matrix exists. Manual Stable selection changes only platform channel manifests and never rebuilds the selected artifacts. The update origin is compiled into Main, permits only credential-free HTTPS, and cannot be supplied by renderer or portable settings. Platform trust and Apple notarization are optional: complete credential groups enable and verify them, while absent or partial groups publish an explicitly warned, fully ad-hoc-signed macOS bundle or unsigned Windows artifacts. Ad-hoc-signed macOS installations use manual replacement because automatic updates require a stable Apple signing identity; unsigned Windows updates remain installer-driven, and Linux remains package-manager-owned and unsigned. See [Desktop updates](../architecture/application-updates/README.md).

## ADR-008: GitHub-native distributed work-item claims

**Status:** Accepted. Multiple contributor-owned Symphony installations may execute against one GitHub Project. GitHub Project field updates do not expose compare-and-set semantics, so `Assistant phase` is an action projection and cannot be the lock. Before GitHub-backed AI work mutates Status or prepares a workspace, the provider atomically creates one deterministic repository ref under `refs/heads/symphony/claims/`; only the winner advances that ref to its metadata commit and persists the opaque token. Ownership is retained across Analyzer, local analysis persistence, Solver, retries, and restart recovery. Release verifies the exact commit token before resetting `Assistant phase` and deleting the ref.

Local SQLite locks were rejected because machines do not share a database. Assignee-only partitioning was rejected because issues may be unassigned or multiply assigned, although assignees still constrain which authenticated contributors may compete. One GitHub account per machine is the deployment identity invariant; different contributor accounts run concurrently. See [Execution lifecycle](../architecture/execution-lifecycle.md) and [Autonomous execution](../architecture/autonomous-execution.md).

**Amendment: leases and fencing.** The original decision rejected time-based leases and automatic stealing because a network partition could produce overlapping implementations, and required an operator to delete a stale claim by hand. That trade proved wrong in practice: a machine that crashes mid-run leaves its claim behind forever, so a second installation silently stops working on the item with no signal that anything is stuck — the failure is invisible, which is worse than the race it avoided.

The claim commit therefore carries `Lease-Until`, `Heartbeat`, and a monotonic `Claim-Version` alongside `Owner`. An orchestrator renews the lease of every running execution on the configured heartbeat interval; an expired lease may be taken over, and every takeover raises the fencing token. The partition risk is bounded rather than eliminated: a partitioned worker keeps running against its isolated worktree, but every write through the coordination port re-reads the claim and refuses when the shared token moved ahead, so it cannot advance the board, publish a pull request, or record a result. It loses its own work, and reports the loss, instead of colliding with the new owner. Lease length and heartbeat interval come from `workflow.policies.claim`, so an installation can widen the window when its runs are long.

Azure DevOps still has no distributed claim. `WorkTrackerRouter.coordinatesWorkItem` returns `false` for it, which keeps the gap visible instead of implying a lock that does not exist; two orchestrators on one Azure board coordinate only through the board column and can race.

## ADR-009: Restricted local repository execution

**Status:** Accepted. Repository preparation, AI execution, and local verification are separate decisions. A new repository begins restricted; clone/fetch may occur only through explicit local preparation and cannot execute repository hooks, checkout filters, submodules, dependency installers, or tests. Analyzer, Solver, and verification require either one-time approval or a machine-local capability grant bound to the normalized repository identity. Remote, autonomous, AI-generated, and imported inputs cannot grant trust.

Verification plans are immutable Utility Process records pinned to a commit. IPC carries only their ID and approval decision. The host executor uses no shell, validates executable-specific argument schemas and working roots, supplies an isolated credential-free runtime home, bounds output/time, and terminates process groups on cancellation. Host execution remains explicitly non-contained: declared network capabilities are approval evidence until a container/VM backend enforces them. See [Local repository verification](../architecture/local-repository-verification.md).

## ADR-010: Workspace-owned AI organization and resilient routes

**Status:** Accepted. A Workspace Definition models one isolated organization. `PositionDefinition` owns responsibilities, allowed delivery roles, and write authority; `AgentProfile` is the concrete AI employee filling one position; `AgentTeam` maps each delivery phase to one primary agent, explicit substitutes, and one portable skill; `AgentRoutePolicy` owns the ordered account/model candidates and hard cost boundary used by that agent. Accounts, agents, positions, skills, and routes remain separate concepts.

Delivery Contexts select a team rather than one workspace-wide agent. Runtime resolution is phase-specific, fail-closed, and restricted to enabled agents, routes, connections, and records owned by the same workspace. `free-only` accepts only free-tier or local candidates, and `local-only` accepts only local candidates. Runtime attempts honor the configured per-agent routing strategy and then explicit fallback-agent order; cancellation never triggers a handoff or degrades route health. Attempt outcomes and average latency are persisted per workspace. Two consecutive failures open a candidate circuit for five minutes, after which one half-open probe is eligible. A positively identified account rate limit or quota exhaustion immediately cools every candidate sharing that workspace account and honors bounded upstream retry hints; ambiguous errors remain route-scoped. Provider continuation state is retained only for the exact session-affine candidate. The durable execution binding is replaced before each attempt so the terminal record names the candidate that actually ran. `maxParallelExecutions` is enforced by an abortable, process-local queue scoped to the workspace and route policy; admission wait is neither a provider attempt nor provider latency. Explicit models are locked out before admission only when an authoritative account-scoped runtime response positively omits them. Codex and OpenCode provide those responses through their isolated CLI protocols; Symphony owns no provider/model inventory. Empty, failed, unsupported, and Claude responses remain `unknown` and fail open. This process-local evidence never becomes renderer-owned configuration.

Settings schema v3 is an intentional alpha breaking change. Stored v2 settings receive a one-time in-process upgrade that preserves accounts, models, skills, and delivery contexts before v3 is atomically persisted; no dual-write or permanent legacy execution path remains.

## ADR-011: Delegated goals and controlled implementation loops

**Status:** Accepted. A work item may be delegated to one responsible AI employee belonging to one workspace team. Responsibility is stable accountability; the executing agent is phase- and failover-specific and is captured separately. `GoalRecord` is the durable outer-loop state machine, while Codex, Claude Code, OpenCode, and optional gateway sessions remain bounded inner provider loops.

A successful Analyzer freezes a versioned implementation contract containing the approved instructions, acceptance criteria, allowed and forbidden paths, command policy, and change budgets. Solver and revision agents receive that contract and the same isolated worktree. Route or agent changes record structured handoff evidence. Completion is fail-closed: changed files and diff size must satisfy the contract, repository-defined deterministic non-network checks must pass, and an explicit review decision must approve the result. Agent text, provider success, or an execution terminal state alone cannot achieve a goal. Revision decisions reuse the goal and contract under the position's iteration budget.

Provider manifests declare capabilities independently from accounts and models. Free-tier routes require timestamped operator-approved evidence that their terms allow commercial use. OpenCode discovers provider/model identifiers directly, while an optional OpenAI-compatible endpoint remains a generic workspace-owned leaf adapter. Neither runtime owns Symphony's goals, credentials, telemetry, worktrees, or review policy. Semantic response caching and automatic write replay are rejected because either could bypass current repository evidence or duplicate a mutation; the immutable contract and handoff snapshots are the supported context-compression and reuse boundary.

## ADR-012: Graph rendering for the delivery process

**Status:** Updated on 2026-10-21. The original Foblex decision of 2026-08-19 is superseded by the published Mosaik 0.1.173 Flow family, which now provides the graph primitive that was missing when this ADR was first accepted.

`ProcessGraphComponent` and `CiJobGraphComponent` use the Angular and Foundation `components/flow` entry points. Mosaik owns node surfaces, orthogonal paths, arrow markers, selection, pan/zoom, fit, minimaps and measured Dagre layout. The layout engine loads its library on demand. Foblex, its four peer packages, its global stylesheet and the manual CI SVG/layout code are removed.

The domain remains independent of diagram libraries. Process stages and transitions retain their identifiers, selection/detail commands, current stage, visit counts and return routes. CI definitions retain their dependencies, conditions, environment names and actual matrix executions. Expressions are never evaluated in the renderer. Conditions and environments appear on selection instead of stretching the diagram. Missing or cyclic dependencies remain explicit; only resolved endpoints produce connections. Large CI graphs initially reveal their first job at readable scale and retain navigation across live updates; smaller diagrams fit once on load.

Both diagrams are read-only. Selection opens details or existing logs; no gesture moves stages or creates, reassigns or persists connections. The separate process-graph entry point and lazy drawer remain the owning integration path. Visual workflow editing remains a separate decision.

## ADR-013: Horizontal feature ownership and static product composition

**Status:** Accepted. The FLAMOX365 architecture is the reference for fifteen horizontal renderer features: Workspace, Work, Team, AI, Skills, Workflow, Execution, CI, Delivery, Automation, Feedback, Mobile, Home, Arcade and Platform. Each feature owns its state, commands, adapters, settings cards/editors and capability contributions behind public package entries and one cohesive `provideXFeature()` composition. The desktop application selects provider/route definitions statically. Generic Search, Setting, Notification, Quick Create, Widget, Update, Interaction, Core, UI and Presentation capabilities are composed once.

Domain, Application, Configuration, IPC and Persistence use populated Core/Feature packages and the required composition owners. Provider packages follow their actual integration families. Cross-feature operations use consumed ports and retain one canonical state or execution owner. Foundation frontend capabilities cannot import feature implementations; Presentation integrates selected desktop/mobile feature surfaces through their public entries. Nx enforces public boundaries and an acyclic graph. The full folder tree and responsibility matrix are in [Dependency model](../architecture/dependency-model.md).

The refactor preserves the Electron Renderer → Preload → Main → Utility Process boundary, all 113 orchestration and 14 native contracts, versioned settings/mobile data, database files and schemas, atomic transaction boundaries and startup/recovery ordering. Configuration retains one validated aggregate writer. Optional feature participants determine the available UI commands and lifecycle participants without allocating replacement writable state. Combined verification and real Electron parity evidence are recorded with the owning architecture documents.
