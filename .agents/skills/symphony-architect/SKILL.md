---
name: symphony-architect
metadata:
  inherits: architecture
description: 'Plan, implement, refactor, test, explain, document or review engineering work in Symphony. Derive from the shared Pixel Brewery architecture foundations with Symphony desktop boundaries, provider-neutral orchestration, persistence, Angular/Mosaik renderer and verification rules.'
---

# Symphony Architect

Carry out the requested engineering task through Symphony's canonical owners. This skill derives from the versioned Pixel Brewery Architecture skill and applies its foundations through Symphony-specific references. Read the base skill and local project contract first; select all applicable domains without loading unrelated references.

## Inherited architecture foundation

1. Read `AGENTS.md`, the inherited [Architecture skill](../architecture/SKILL.md), its [shared workflow](../architecture/references/common/workflow.md) and the [local project contract](references/project.md) at task start, whether or not this skill was mentioned.
2. Follow the base workflow for task scope, ownership, subagent coordination, implementation and verification. Select all applicable common modules in the table below and combine them with the local project references; classify tests by both test kind and production owner.
3. Apply Symphony's explicit framework and runtime translations below. Local specialization does not waive the common structural, contract, lifecycle, isolation or verification foundations.
4. The base is installed in `.agents/skills/architecture` from `pixel-brewery/skills`; `skills-lock.json` pins its immutable commit and content digest. Validate the installed base and this derivation with `python3 .agents/skills/architecture/scripts/check_inheritance.py --root . --derived symphony-architect`. If the base is missing or invalid, restore the locked skill before dependent work; do not substitute a peer checkout or a remembered copy.

## Symphony applicability and precedence

User instructions and the authorized scope govern the task. Symphony's `AGENTS.md` and local references apply the shared foundations to the actual desktop platform and take precedence over another project's framework-specific examples. Executable configuration resolves stale paths, dependencies and runners; it does not waive a structural rule.

- Preserve Angular Renderer → typed preload API → Electron Main → Orchestrator Utility Process. Domain and application policy remain framework- and provider-neutral.
- NestJS, Prisma, Archipel configuration/mapping services, HTTP envelopes and SaaS tenant/billing examples remain reference material. Apply their ownership, validation, isolation and lifecycle principles through Symphony's existing ports, Zod contracts and SQLite adapters; they do not authorize adding those frameworks or services.
- The dedicated local mobile companion is the explicit ADR-006 exception to the no-general-HTTP-server rule. Its versioned contract, selected private interface, packaged assets, pairing, authorization, limits and Utility Process lifecycle remain mandatory.
- Keep the complete architecture, SOLID/OOP, platform, safety, API/contract, frontend, time, testing, resource-bound, migration and documentation foundations. [Origin and translations](references/origin.md) records how they apply here.

| Task or production boundary | Common module | Symphony application |
| --- | --- | --- |
| Every task | [Workflow](../architecture/references/common/workflow.md) | [Project contract](references/project.md), [Environment](references/environment.md) |
| Solution design, architecture review, cross-cutting concerns, refactoring or migration | [Architecture](../architecture/references/common/architecture.md) | [Architecture application](references/architecture.md) |
| TypeScript abstraction, SOLID, composition, source conventions or pattern selection | [OOP/design patterns](../architecture/references/common/oop.md) | [Project source conventions](references/project.md), [Architecture application](references/architecture.md) |
| Application services, orchestration, queries, state, SQLite or persistence | [Backend](../architecture/references/common/backend.md) | [Backend integration](references/backend.md) |
| IPC/preload/process messages, runtime validation, serialization or mobile contracts | [Backend contracts](../architecture/references/common/backend-contracts.md), [API URLs](../architecture/references/common/api.md) | [Transport contracts](references/backend-contracts.md) |
| Provider ports/adapters, configuration, external I/O, credentials, lifecycle or bounded resources | [Platform](../architecture/references/common/platform.md) | [Platform owners](references/platform.md), [Architecture application](references/architecture.md) |
| Authorization, AI, files/downloads, reads, external destinations, events, feedback or cleanup | [Backend safety](../architecture/references/common/backend-safety.md) | [Platform integration](references/platform.md), [Backend integration](references/backend.md) |
| Angular renderer/mobile UI, Mosaik, TypeScript/HTML/SCSS, forms, presenters, routing or localization | [Frontend](../architecture/references/common/frontend.md), [Frontend patterns](../architecture/references/common/frontend-patterns.md) | [Frontend integration](references/frontend.md) |
| Calendar days, instants, time zones, expiry, scheduling, filters or presentation | [Date/time](../architecture/references/common/date-time.md) | [Temporal integration](references/date-time.md) |
| Unit/integration/IPC/contract/component tests, mocks, timers, coverage or spec ownership | [Testing](../architecture/references/common/testing.md), plus the production domain | [Test integration](references/testing.md) |
| Playwright Electron/mobile journeys and acceptance evidence | [Browser E2E](../architecture/references/common/e2e.md), plus the production domain | [Browser integration](references/e2e.md) |
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
