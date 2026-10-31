# Repository AI configuration

Symphony adopts the repository-level assistant architecture from the read-only FLAMOX365 reference. Its architect retains the complete shared Archipel, FLAMOX365 and Synapse foundations and applies framework-specific examples through local rules for this Electron orchestration platform.

## Ownership

| Surface                        | Source of truth                        | Generated consumers                                                                         |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Shared repository instructions | AGENTS.md                              | thin CODEX.md and CLAUDE.md adapters                                                        |
| Portable skills                | .agents/skills/<name>/                 | .agents/packages/<name>.skill, skills-lock.json, .claude/skills/<name>/SKILL.md             |
| Agent descriptions             | .github/agents/*.agent.md              | .codex/agents/_.toml, .opencode/agents/_.md, .claude/agents/_.md, repository wrapper skills |
| Scoped instructions            | .github/instructions/*.instructions.md | repository wrapper skills                                                                   |
| Prompts                        | .github/prompts/*.prompt.md            | .opencode/commands/*.md, repository wrapper skills                                          |
| Reference rules                | .github/rules/*.md                     | repository wrapper skills                                                                   |
| MCP servers                    | .vscode/mcp.json                       | .codex/config.toml, opencode.json, .mcp.json                                                |

.agents/scripts/sync_agent_configuration.py owns provider adapter generation and drift detection. .agents/scripts/package_skills.py validates portable sources, writes deterministic ZIP-compatible .skill archives with one matching top-level directory, and records SHA-256 digests.

## Adopted and adapted reference concepts

| FLAMOX365 reference concept                                                          | Symphony decision                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared AGENTS.md plus thin provider files                                            | Adopted                                                                                                                                                                     |
| One shared .agents/skills tree                                                       | Adopted                                                                                                                                                                     |
| Deterministic Codex, OpenCode, and Claude Code generation                            | Adopted                                                                                                                                                                     |
| Portable issue create/analyze/solve packages                                         | Adapted to provider-neutral repository change requests and Symphony safety boundaries                                                                                       |
| Repository guidance exposed as generated skills                                      | Adopted                                                                                                                                                                     |
| Provider-neutral MCP registry                                                        | Adopted with only Nx, repository filesystem, Playwright, Angular, and Mosaik servers                                                                                        |
| Nx workspace skills                                                                  | Adapted to current Symphony projects and tasks                                                                                                                              |
| Shared architect workflow and all 13 common foundation modules                       | Retained unchanged in `symphony-architect`; Symphony-specific references translate framework, transport, database and browser examples to the desktop owners                |
| FLAMOX365 NestJS, Prisma, Archipel, PostgreSQL, hosting, and product-domain examples | Retained where part of the common foundations; local references preserve their general principles without introducing those runtimes or product policies                    |
| Nx Cloud self-healing CI agent                                                       | Intentionally omitted because this workspace is not configured for Nx Cloud                                                                                                 |
| Caveman communication extensions                                                     | Intentionally omitted because they do not encode product or repository architecture                                                                                         |
| GitHub MCP remote at the Copilot endpoint                                            | Intentionally omitted; the desktop application mediates GitHub through its configured connector or CLI profile, and repository automation must not add a Copilot dependency |

## Symphony architect

`.agents/skills/symphony-architect` owns the complete engineering guidance. Its shared workflow block and all 13 `references/common` modules are unchanged copies of the Archipel architect, verified against the FLAMOX365 and Synapse architects. Local references apply those foundations to Electron/process boundaries, provider-neutral application policy, Zod IPC/mobile contracts, SQLite, managed worktrees, Angular/Mosaik composition and actual verification tooling. Framework-specific examples do not introduce another runtime or transport.

`AGENTS.md` selects `$symphony-architect` for engineering work. The existing `$architect-desktop-platform` invocation forwards to that canonical skill; its former desktop rules remain in the local references. The normal agent synchronization generates the Claude mirror, portable archive and lock entry.

`.agents/scripts/sync_architect_core.py --peer <other-checkout> --check` compares common modules and the shared workflow without requiring peer checkouts during ordinary skill use. The local helper recognizes Symphony/Synapse and keeps peer helper scripts local. Source formatting excludes the retained core so it stays byte-identical; project changes belong in local references. Use `--write` only for an authorized shared-core update to the selected peer, then run that repository's own synchronization.

## Update workflow

1. Edit a source under .agents/skills, .github, or .vscode/mcp.json.
2. Run yarn agents:sync.
3. Review generated adapters and skills-lock.json.
4. Run yarn agents:check.
5. Run the normal repository verification appropriate to the change.

Never edit generated adapters or .skill archives directly. Never store credentials in repository configuration.
