# Repository AI configuration

**Dokumentstatus:** Implementierter Ist-Stand

Symphony keeps repository-owned assistant rules separate from a versioned shared Architecture foundation. Repository instructions select `symphony-architect`; that skill explicitly reads the installed `architecture` base and applies its principles through Symphony's desktop, process, provider, persistence and Angular/Mosaik contracts.

## Sources and generated consumers

| Surface                                          | Source of truth                                            | Generated consumers                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Repository instructions                          | `AGENTS.md`                                                | Thin `CODEX.md` and `CLAUDE.md` adapters                                                               |
| Shared Architecture foundation                   | `pixel-brewery/skills`, `skills/architecture`              | Installed copy in `.agents/skills/architecture`, tracked in root `skills-lock.json`                    |
| Local skill rules                                | `.agents/skills/<name>` excluding imported skills          | `.claude/skills/<name>/SKILL.md`, `.agents/packages/<name>.skill`, `.agents/packages/skills-lock.json` |
| Agent descriptions                               | `.github/agents/*.agent.md`                                | Codex/OpenCode/Claude agents and repository wrapper skills                                             |
| Scoped instructions, prompts and reference rules | `.github/instructions`, `.github/prompts`, `.github/rules` | Provider commands and repository wrapper skills                                                        |
| MCP servers                                      | `.vscode/mcp.json`                                         | `.codex/config.toml`, `opencode.json`, `.mcp.json`                                                     |

The sync command projects these sources without granting external-write, branch, release or product-change authority. It excludes plugin-provided Nx skills from Claude's mirror to avoid duplicate registration; Codex and OpenCode continue to use the canonical tree.

## Versioned Architecture derivation

The local `symphony-architect` declares `metadata.inherits: architecture` and explicitly reads `../architecture/SKILL.md`. This is an instruction and validation contract rather than native Skill-format inheritance. The local router combines relevant base modules with Symphony references. Generic foundations remain binding; explicit local translations determine their application to actual desktop owners without introducing another framework, transport or database.

The root standard Skills CLI lock records the source repository, `skills/architecture/SKILL.md`, a full immutable Git commit in `ref`, and the installed-folder SHA-256 in `computedHash`. The base is committed with the consumer repository, so ordinary work requires neither another project checkout nor network access. The imported directory is excluded from source formatting and must not be edited locally.

`python3 .agents/scripts/sync_architect_core.py --check` delegates to the installed base checker. It validates the lock, revision, installed-source digest and explicit local derivation. Missing or modified base content prevents successful agent synchronization; restore the locked source rather than falling back silently to remembered or peer rules.

Symphony retains these concrete adaptations:

- Angular Renderer → validated preload API → Electron Main → Orchestrator Utility Process; neutral domain and application policy.
- Constructor-injected application ports, provider adapters and typed configuration instead of another project's NestJS/Prisma runtime.
- Zod desktop/process contracts; public HTTP rules apply only to actual HTTP boundaries such as the accepted mobile companion.
- SQLite/workspace isolation and Playwright Electron journeys according to the actual environment contract.
- Existing source conventions, Mosaik composition, documentation gates and local authority rules.

## Installation and updates

Select a full commit and install through the standard Skills CLI from the repository root, for example:

```sh
npx skills add https://github.com/pixel-brewery/skills/tree/<commit>/skills/architecture --skill architecture --agent codex --copy --yes
```

Review the root lock's immutable `ref`, source and digest. A branch name or floating default branch is not an accepted Architecture pin. Run `yarn agents:sync`, review the local instructions and generated artifacts, then run `yarn agents:check`. Common changes are authored upstream and adopted through a deliberate new pin; local rules remain in their existing local skill references.

## Portable archive contract

`.agents/scripts/package_skills.py` validates each canonical skill and produces deterministic ZIP-compatible `.skill` archives with one matching top-level directory, canonical LF source bytes, fixed timestamps and canonical Unix file attributes. The generated catalog lives at `.agents/packages/skills-lock.json`; it is distinct from the standard root installation lock and never replaces it.

For a declared `metadata.inherits` base, packaging includes that base under `dependencies/<base-name>` inside the derived archive and rewrites included Markdown links to their archive-relative locations. `dependencies/skills-lock.json` carries only the bundled dependencies' native installation entries, retaining their immutable upstream revisions and content digests. Importing `symphony-architect.skill` therefore retains both the foundation and local rules without requiring a sibling skill installation. Missing bases and inheritance cycles fail packaging. Source files remain unchanged by this projection.

Never edit archives, provider mirrors or the portable catalog directly. Run `yarn agents:sync` to regenerate them and `yarn agents:check` to detect drift. These checks prove skill-source integrity and generation consistency; they do not establish a product runtime, browser journey, build, package or release result.
