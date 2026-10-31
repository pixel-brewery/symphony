---
name: symphony-architect
description: 'Plan, implement, refactor, test, explain, document or review engineering work in Symphony. Apply the complete shared Archipel, FLAMOX365 and Synapse architecture foundations with Symphony desktop boundaries, provider-neutral orchestration, persistence, Angular/Mosaik renderer and verification rules.'
---

# Symphony Architect

Carry out the requested engineering task through Symphony's canonical owners. This native skill retains every shared foundation from the Archipel, FLAMOX365 and Synapse architects and applies them through Symphony-specific references. Read the shared workflow and local project contract first; select all applicable domains without loading unrelated references.

<!-- architect-core:start -->

## Select and apply the relevant guidance

1. Read `AGENTS.md`, [shared workflow](references/common/workflow.md) and [local project contract](references/project.md) at task start, whether or not this skill was mentioned.
2. Identify the requested action and actual production owners. A test task is classified by both its test kind and the code it exercises.
3. Own task decomposition, maximum useful subagent parallelism and result integration for every task. Follow [parallel subagent coordination](references/common/workflow.md#parallel-subagent-coordination); use the active Claude Code or ChatGPT/Codex client's native subagents without waiting for another delegation request.
4. Select all applicable domain rows below; combine domain and testing guidance. Read the common module and its project reference before editing. Do not load every reference by default.
5. Complete the canonical-owner/reference pass before implementation; inspect installed platform capabilities and actual consumers/generators. Keep the reference map in task context.
6. Revisit routing and work allocation when another boundary is reached. Specific project rules govern their actual owners; executable configuration resolves stale paths, versions, runners and generation assumptions.
7. Complete the task-scoped drift/duplication pass, focused verification and local documentation/consequence gates. Preserve the requested mode and output format; ordinary implementation does not imply a full architecture report, scoring rubric, Definition of Done, legal review or release.

The common modules and this workflow are synchronized across the Archipel, Mosaik and FLAMOX365 architect skills. Each skill works independently from its own checkout. Keep project-specific paths, policies and compatibility choices in the local references; compare shared changes with `.agents/scripts/sync_architect_core.py --peer <other-checkout> --check` for each peer.
<!-- architect-core:end -->

## Symphony applicability and precedence

User instructions and the authorized scope govern the task. Symphony's `AGENTS.md` and local references apply the shared foundations to the actual desktop platform and take precedence over another project's framework-specific examples. Executable configuration resolves stale paths, dependencies and runners; it does not waive a structural rule.

- Preserve Angular Renderer → typed preload API → Electron Main → Orchestrator Utility Process. Domain and application policy remain framework- and provider-neutral.
- NestJS, Prisma, Archipel configuration/mapping services, HTTP envelopes and SaaS tenant/billing examples remain reference material. Apply their ownership, validation, isolation and lifecycle principles through Symphony's existing ports, Zod contracts and SQLite adapters; they do not authorize adding those frameworks or services.
- The dedicated local mobile companion is the explicit ADR-006 exception to the no-general-HTTP-server rule. Its versioned contract, selected private interface, packaged assets, pairing, authorization, limits and Utility Process lifecycle remain mandatory.
- Keep the complete architecture, SOLID/OOP, platform, safety, API/contract, frontend, time, testing, resource-bound, migration and documentation foundations. [Origin and translations](references/origin.md) records how they apply here.

| Task or production boundary | Common module | Symphony application |
| --- | --- | --- |
| Every task | [Workflow](references/common/workflow.md) | [Project contract](references/project.md), [Environment](references/environment.md) |
| Solution design, architecture review, cross-cutting concerns, refactoring or migration | [Architecture](references/common/architecture.md) | [Architecture application](references/architecture.md) |
| TypeScript abstraction, SOLID, composition, source conventions or pattern selection | [OOP/design patterns](references/common/oop.md) | [Project source conventions](references/project.md), [Architecture application](references/architecture.md) |
| Application services, orchestration, queries, state, SQLite or persistence | [Backend](references/common/backend.md) | [Backend integration](references/backend.md) |
| IPC/preload/process messages, runtime validation, serialization or mobile contracts | [Backend contracts](references/common/backend-contracts.md), [API URLs](references/common/api.md) | [Transport contracts](references/backend-contracts.md) |
| Provider ports/adapters, configuration, external I/O, credentials, lifecycle or bounded resources | [Platform](references/common/platform.md) | [Platform owners](references/platform.md), [Architecture application](references/architecture.md) |
| Authorization, AI, files/downloads, reads, external destinations, events, feedback or cleanup | [Backend safety](references/common/backend-safety.md) | [Platform integration](references/platform.md), [Backend integration](references/backend.md) |
| Angular renderer/mobile UI, Mosaik, TypeScript/HTML/SCSS, forms, presenters, routing or localization | [Frontend](references/common/frontend.md), [Frontend patterns](references/common/frontend-patterns.md) | [Frontend integration](references/frontend.md) |
| Calendar days, instants, time zones, expiry, scheduling, filters or presentation | [Date/time](references/common/date-time.md) | [Temporal integration](references/date-time.md) |
| Unit/integration/IPC/contract/component tests, mocks, timers, coverage or spec ownership | [Testing](references/common/testing.md), plus the production domain | [Test integration](references/testing.md) |
| Playwright Electron/mobile journeys and acceptance evidence | [Browser E2E](references/common/e2e.md), plus the production domain | [Browser integration](references/e2e.md) |
| Nx generation/linking, package exports, API documentation, skills, MCP or generated output | Production domain above | [Tooling and documentation](references/tooling.md) |

Examples of combined selection:

- Provider or agent-runtime change: Architecture + Platform + Backend safety + Testing; preserve workspace/account scope, typed results, bounded execution and owned cancellation/disposal.
- IPC method: Backend + Backend contracts + Testing; trace request and response validation, preload, Main routing, Utility Process dispatch and the real renderer consumer.
- Angular form/drawer/board: Frontend + Frontend patterns + Testing; inspect the exact FLAMOX365/Mosaik owners and record Adopt/Adapt/Differ decisions before verifying the affected Electron route.
- Workspace/persistence migration: Architecture + Backend + Platform + Testing; preserve leases, versioned state, recovery and isolated executable worktrees.
- Browser task: Browser E2E + Symphony's packaged-process integration; Chrome-only reference guidance does not replace the real Electron application.

Apply the completion and consequence gates in [the project contract](references/project.md). Ordinary skill use does not imply Definition of Done, a legal review, publishing, a release or permission to message others.

## Local environment

Every task also applies [Environment](references/environment.md): resolve the actual configured runtime, reuse necessary services, coordinate heavy checks, isolate test-owned SQLite/workspace data and clean up owned helpers. Symphony has no NestJS API or PostgreSQL server; do not copy another project's ports or database prerequisites. Packaged Electron journeys use the repository's real Electron fixture and process model.
