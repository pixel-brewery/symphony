# Symphony Desktop Agent Guide

This repository contains a local-first desktop orchestration platform for Codex-based software-development workflows.

## Repository AI configuration

- `AGENTS.md` is the shared repository instruction source. Keep `CODEX.md` and `CLAUDE.md` as thin provider adapters.
- `.agents/skills/` is the canonical skill tree for portable ChatGPT- and Codex-compatible skills. Repository-owned skills are editable; imported skills tracked in root `skills-lock.json` are maintained through the Skills CLI rather than edited locally.
- `.github/agents/`, `.github/instructions/`, `.github/prompts/`, and `.github/rules/` own repository agent descriptions and scoped guidance.
- `.vscode/mcp.json` is the provider-neutral MCP registry. Never commit literal credentials, token values, or absolute developer paths.
- Run `yarn agents:sync` after changing agent, prompt, MCP, or skill configuration. Run `yarn agents:check` before handoff.
- Generated files under `.codex/`, `.opencode/`, `opencode.json`, `.claude/skills/`, `.claude/agents/`, `.mcp.json`, `.agents/packages/`, and `.agents/packages/skills-lock.json` must not be edited directly.
- Skills vendored under `.github/skills/` (the nx toolchain skills) are excluded from the `.claude/skills/` mirror, and the nx MCP server is excluded from `.mcp.json`: Claude Code loads both from the `nx@nx-claude-plugins` plugin enabled in `.claude/settings.json`. Codex and OpenCode keep using the vendored copies and the `nx` server from `.vscode/mcp.json`.
- `yarn nx configure-ai-agents` and `yarn agents:sync` write to overlapping paths, and the sync wins because `agents:check` gates handoff. Configuring `codex` or `opencode` through Nx injects an `nx-mcp` server, copies Nx's own commands and subagents into `.codex/` and `.opencode/`, and recreates `.opencode/skills/`; the next `agents:sync` reverts the generated files and deletes the skill copies, so run Nx first and the sync afterwards. Add MCP servers only in `.vscode/mcp.json`.
- Never expose a skill to Claude Code by symlinking `.claude/skills/<name>` at `.agents/skills/<name>`. The sync writes the generated mirror to that path and would overwrite the source; it now removes such a symlink instead of following it.
- Invoke `$reuse-existing-patterns` before and after implementation work.
- Apply `$symphony-architect` for Symphony engineering work. It explicitly derives from `.agents/skills/architecture/SKILL.md`, installed from `pixel-brewery/skills` at the immutable revision and content digest in root `skills-lock.json`. Symphony-specific rules remain in `.agents/skills/symphony-architect`. Shared changes belong upstream; update the locked base through the Skills CLI, then run `yarn agents:sync` and `yarn agents:check`. `architect-desktop-platform` remains a compatibility entrypoint.

## Architecture invariants

- OmniRoute is research-only reference material. Never add it as a dependency, provider, runtime, account, catalog source, gateway, integration, default, example, or user-visible label. Symphony owns its provider/model catalog, routing, and failover; CLI execution adapters remain replaceable implementation details and never own the visible catalog.
- Keep the Angular renderer sandboxed and free of Node.js APIs.
- Cross the desktop boundary only through the typed, Zod-validated API in `libs/ipc-contracts`: feature schemas, the composed orchestration contract, and the separate native desktop contract.
- Keep Electron Main focused on lifecycle, IPC routing, credential mediation, and utility-process supervision.
- Run orchestration, Git, GitHub, Codex, workspace, and persistence work only in `apps/orchestrator` or provider libraries.
- Do not add a general internal HTTP server, NestJS, Express, another UI framework, or a cloud runtime. The accepted local mobile-companion exception may run only in the orchestrator Utility Process, bind to one selected private local-network interface, serve the packaged `apps/mobile` assets, and expose the dedicated versioned mobile contract with pairing, authorization, limits, and lifecycle supervision described by ADR-006.
- Keep domain libraries framework- and provider-neutral. GitHub API types do not cross provider boundaries.
- Use isolated Git worktrees for executable target-project work. Never mutate a user's ordinary checkout, push a default branch, or merge automatically.
- Analyzer-stage production adapters are read-only with respect to target source files.

## Frontend conventions

- Use Angular standalone components, Signals, route-level lazy loading, and `ChangeDetectionStrategy.OnPush`.
- Treat visible FLAMOX365 behavior and composition as the renderer baseline. For every renderer change, inspect the exact read-only FLAMOX365 and Mosaik sources, adopt the proven pattern unless a desktop or product constraint requires adaptation, and record every intentional difference in `docs/architecture/frontend-reference-flamox.md`. Unexplained visual or behavioral drift is not acceptable.
- Use Mosaik components and tokens before introducing product-owned UI primitives.
- Read `DESIGN.md` before styling work: it is the generated projection of the effective theme — the Mosaik Soho baseline merged with `ApplicationThemeOverrides.ts` — plus the registered icon vocabulary and the renderer override stylesheets. Run `yarn design:md` after changing any of those inputs or upgrading Mosaik; `yarn verify` fails while it is stale. `COMPONENTS.md` beside it is generated by the same `mosaik-design-md` bin of `@pixel-brewery/mosaik-themes` and lists every component token with the value Symphony renders. The browsable component contracts and live previews are built into `.ds-sync/artifact/` and published as the Symphony Design System artifact, with the pipeline in `.design-sync/NOTES.md`.
- Use Tailwind v4 utilities directly in View templates for layout, positioning, sizing, spacing, overflow, and responsive composition. Do not add semantic product class names to View templates.
- Do not use Tailwind color, background, border-style, radius, shadow, typography, opacity, transition, animation, or filter utilities. Express visual semantics through public Mosaik component inputs such as `appearance`, `variant`, `elevation`, typography, slots, and theme configuration.
- Keep every View as an isolated three-file unit with matching `.ts`, `.html`, and `.scss` files. Keep View SCSS empty when Mosaik inputs and Tailwind layout utilities fully express the view; use it only for host-local structure that cannot be expressed through those public mechanisms. Do not override Mosaik parts or internal CSS custom properties from a View. The sole renderer-shell exception is the layout-only Mosaik App geometry contract for header and navigation sizing when no public App input exists; it must stay in the App template, must not set visual tokens, and must be documented as an Adapt.
- Keep ViewPresenters limited to application state, domain projections, lifecycle, and commands. Assemble simple conditional text in the owning HTML template and implement reusable formatting, icon, appearance, and variant mappings as standalone pure Angular pipes.
- Treat the provider-neutral board model as the source for Mosaik FlowBoard projections.
- Compose user-visible text from explicit fields and conditions in the owning HTML template. Do not hide presentation decisions in opaque presenter fields or methods such as `details`, `summary`, `subtitle`, or pre-concatenated display strings; use a focused pipe or directive only when the formatting logic is reusable or too specialized for the template.
- Add stable `test-id` attributes to interactive acceptance-test surfaces.
- Apply a UI relevance gate before adding any visible element: it must support a user decision or action, explain a user-facing problem, or provide necessary task context.
- Do not expose implementation architecture, generic health states, storage locality, process boundaries, or security claims as workspace decoration. Put actionable diagnostics only where the related problem can be resolved.
- Do not duplicate the same information across a page and its rail, and do not use badges, indicators, labels, or explanatory copy solely to fill visual space.

## Test file naming

- Keep every unit, integration, contract, component, and regression spec beside the exact production file it tests: `ProductionFile.ts` owns the adjacent `ProductionFile.spec.ts`.
- Split a spec when it tests multiple production files; do not name non-E2E specs after features, scenarios, implementation layers, or historical aggregate modules.
- End-to-end journey specs and repository-policy specs may remain behavior-named because they intentionally span multiple production files.

## Code conventions

- TypeScript is strict ESM except the sandboxed Electron preload bundle, which is CommonJS because Electron sandboxed preloads do not support arbitrary ESM imports.
- Use constructor injection at application and provider boundaries.
- Prefer immutable values, typed identifiers, discriminated unions, exhaustive switches, and explicit errors.
- Every source file with imports starts with an import block wrapped in `// #region Imports` / `// #endregion`.
- The FLAMOX365 engineering instructions are binding for Symphony source: one public export per file named after
  that export, `I`-prefixed interfaces, `_`-prefixed private fields, `Fields`/`Ctor`/`Properties`/`Methods` class
  regions, TSDoc with access tags on public members, three-file View units, and AAA-marked specs.
  `yarn instruction:check` enforces them; `docs/architecture/instruction-compliance-refactoring.md` records the
  rule-by-rule interpretation and the remaining work.
- Run tasks through Yarn and Nx.

## Documentation

- For every implementation task, invoke the repository-local `symphony-docs` skill before declaring the task complete and synchronize all affected functional documentation under `docs/project` with the verified behavior.
- For every implementation task, invoke the repository-local `symphony-technical-docs` skill before declaring the task complete and synchronize all affected technical documentation under `docs/architecture` with the verified implementation and accepted architecture decisions. The result must be self-contained and precise enough that Codex could implement the documented capability in another project without access to this repository.
- Treat `docs/project` as functional documentation that may be shared externally; keep its main narrative focused on product behavior and avoid unnecessary implementation details.
- Organize `docs/project` by product features and user outcomes, never by backend, frontend, database, app, library, or package boundaries.
- Keep `docs/architecture` as the feature-oriented technical handbook. Use `docs/architecture/<feature>/README.md` as the stable entry point; never organize it by backend, frontend, database, app, library, package, framework, or provider. New standalone technical documents belong there, and affected legacy technical files directly under `docs` must be migrated there when their content changes.
- Every technical page must distinguish implemented current state, binding target architecture, and migration contracts; repository paths may locate the current implementation but must not replace the semantic description of responsibilities, contracts, behavior, failure handling, and acceptance criteria.
- For each affected feature, document triggers, prerequisites, automatic consequences, configuration, permissions, states, decision rules, and exceptional cases when they materially affect behavior.
- When functional documentation or technical documentation does not need to change, still report both completed impact checks and the concrete reason for each.

## Verification

Run `yarn verify` for formatting, lint, type checking, tests, builds, and boundary checks. Run `yarn e2e` after building to exercise the packaged-process model with Playwright. Run `yarn forge:package` for the packaging smoke test.

Invoke `$definition-of-done` only when the user explicitly requests Definition of Done. Its release-candidate sequence is `yarn agents:check`, `yarn verify`, `yarn e2e`, then `yarn forge:package`.

## Reference repositories

`../flamox` remains a read-only architectural reference. `../mosaik` is an editable companion repository when a Symphony change explicitly requires coordinated Mosaik APIs. Mosaik remains a package dependency and must not be copied into Symphony.

The renderer parity contract is permanent: a renderer handoff must re-audit every affected route against the exact FLAMOX365 source, classify each material decision as Adopt, Adapt, or Differ, and verify the result in the running Electron application. Product-neutral data, local desktop boundaries, and unavailable FLAMOX365 services may differ only when that difference is explicit and documented.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
