# Repository AI configuration

**Dokumentstatus:** Implementierter Ist-Stand

Symphony keeps repository-owned assistant rules separate from a versioned shared Architecture foundation. Repository instructions select `symphony-architect`; that skill explicitly reads the installed `architect` base and applies its principles through Symphony's desktop, process, provider, persistence and Angular/Mosaik contracts.

## Sources and generated consumers

| Surface                                          | Source of truth                                                                                    | Generated consumers                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Repository instructions                          | `AGENTS.md`                                                                                        | Thin `CODEX.md` and `CLAUDE.md` adapters                                                                            |
| Shared Architecture foundation                   | `pixel-brewery/skills`, `skills/architect`                                                         | Installed copy in `.agents/skills/architect`, tracked in root `skills-lock.json`                                    |
| Local Designer                                   | `symphony-designer` explicitly reading the pinned shared `designer` and its local project contract | Generated Claude adapter and portable archive                                                                       |
| Local skill rules                                | `.agents/skills/<name>` excluding imported skills                                                  | `.claude/skills/<name>/SKILL.md`, `.agents/packages/<name>.skill`, `.agents/packages/skills-lock.json`              |
| Agent descriptions                               | `.github/agents/*.agent.md`                                                                        | Codex/OpenCode/Claude agents and repository wrapper skills                                                          |
| Scoped instructions, prompts and reference rules | `.github/instructions`, `.github/prompts`, `.github/rules`                                         | Provider commands and repository wrapper skills                                                                     |
| MCP servers                                      | `.vscode/mcp.json`                                                                                 | `.codex/config.toml`, `opencode.json`, `.mcp.json`, `.github/mcp.json`, `.cursor/mcp.json`, `.gemini/settings.json` |

The sync command projects these sources without granting external-write, branch, release or product-change authority. It excludes plugin-provided Nx skills from Claude's mirror to avoid duplicate registration; Codex and OpenCode continue to use the canonical tree.

## Eigener Designer auf gemeinsamer Basis

[Symphony Designer](../../../.agents/skills/symphony-designer/SKILL.md) übernimmt jede UI-Frage, neue Idee, Implementierung und Designreview. Der Einstieg liest den importierten `designer`, dessen verbindliche Projektintegration und den [lokalen Designvertrag](../../../.agents/skills/symphony-designer/references/project.md) ausdrücklich. `metadata.inherits: designer` dokumentiert diese Abhängigkeit; erst die Leseanweisung setzt sie um.

Die gemeinsame Basis stammt aus `pixel-brewery/skills`, `skills/designer`, am geprüften Commit `c8edaf6c9dea60a96e0f75f09dc3c7ea6ec30c46` mit Skills-CLI-Hash `55ad6fa49c44b1e3538762f842e1ed3db40b4ab68a3165345eb7cc02c812a0d0`. Der Installer hält Revision und Digest im normalen Root-Lock fest. Gemeinsame Regeln werden upstream gepflegt und über Skills CLI übernommen; importierte Quelldateien und Lockeinträge werden nicht manuell angepasst. Prettier schließt den kanonischen Import und die installierte Claude-Kopie aus. Der bestehende Generator behält die Zuständigkeit für Claudes Adapter und portable Archive.

Der lokale Vertrag erhält Symphonys eigene Ausprägung: Soho/Inter und beide Erscheinungsbilder, den bestehenden Override-Export, tatsächliche Provider/Icons, die Generatorquellen von `DESIGN.md` und `COMPONENTS.md`, englische/deutsche Runtime-Kataloge und die installierte Komponenten-API. `inspect-reference-ui` bleibt darunter als spezialisiertes Paritätsmodul mit dem exakten privaten, nur lesbaren Referenzvergleich und dokumentierten Adopt/Adapt/Differ-Entscheidungen. Das ist kein konkurrierender allgemeiner Designer und wird deshalb nicht entfernt. Die UI-Relevanzregel, View-/Presentergrenzen und die ausdrücklich begrenzte Shell-Geometrieausnahme bleiben erhalten.

Die gemeinsame Katalogprozedur wird nicht lokal dupliziert. Öffentliche Katalogaufgaben verwenden ausschließlich den benannten lokalen Server `mosaik`. Cloudoperationen sind darüber nicht verfügbar. Bei einem Fehler wird nicht auf einen Webkatalog oder einen anderen Dienst ausgewichen. Diese Entwicklungsassistenz ändert keine fachliche Symphony-Funktion oder Kundenkonfiguration.

## Ein lokaler Mosaik-Server

Die kanonische Registry definiert genau einen Mosaik-Server: `mosaik` startet das bereits installierte Paket `@pixel-brewery/mosaik-mcp@0.1.202` über `yarn exec mosaik-mcp` im Repository-Arbeitsverzeichnis. Die Konfiguration enthält `command: "yarn"` und `args: ["exec", "mosaik-mcp"]`; Yarn löst damit den installierten Workspace-Bin auf. Ein interner JavaScript-Pfad, ein Download beim Start oder ein HTTP-Katalog ist nicht konfiguriert. CLI-Clients werden vom Repository-Root gestartet. Claudes bereits aktiviertes Nx-Plugin bleibt zuständig für Nx; der lokale Mosaik-Server wird daneben einmal registriert.

Der bestehende Generator projiziert die Verbindung in sieben Clientformen. Die Registry bleibt die einzige MCP-Quelle; die Projektionen werden durch `yarn agents:sync` erzeugt und durch `yarn agents:check` gegen sie geprüft.

| Client             | Konfiguration           | Mosaik-Semantik                                                                                       |
| ------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| VS Code / Copilot  | `.vscode/mcp.json`      | Kanonischer STDIO-Eintrag; `${workspaceFolder}` als Arbeitsverzeichnis                                |
| Codex              | `.codex/config.toml`    | Lokaler Prozess mit Arbeitsverzeichnis `.` und Start-/Toolzeitlimits                                  |
| Claude Code        | `.mcp.json`             | Lokaler STDIO-Prozess; Nx bleibt separat durch das aktivierte Plugin bereitgestellt                   |
| OpenCode           | `opencode.json`         | Lokale Befehlsliste `["yarn", "exec", "mosaik-mcp"]`                                                  |
| GitHub Copilot CLI | `.github/mcp.json`      | STDIO mit ausschließlich hier gesetztem `tools: ["*"]`                                                |
| Cursor             | `.cursor/mcp.json`      | Befehls-/Argumenteintrag im `mcpServers`-Schema                                                       |
| Gemini CLI         | `.gemini/settings.json` | Lokaler Prozess mit `cwd: "."`, 60 Sekunden Timeout und `AGENTS.md`/`GEMINI.md` als Kontextdateinamen |

Die drei zusätzlichen MCP-Projektionen für Copilot CLI, Cursor und Gemini enthalten ausschließlich `mosaik`; bestehende Nx-/Angular-/Filesystem-/Playwright-Verbindungen der anderen Clients bleiben in deren bisherigem Umfang erhalten. Der Generator wahrt Claudes Nx-Plugin-Ausschluss und fügt keine MCP-Zugangsdaten, globalen Clientrichtlinien oder weitere Services hinzu.

Das Paket ist eine Entwicklungsabhängigkeit. Die erstmalige Installation benötigt GitHub Packages und die bestehende Paket-Leseberechtigung. Zugangsdaten verbleiben in der Registry-Umgebung und gehören nicht in MCP-Dateien. Danach arbeitet der lokale Prozess ohne Netzwerkzugriff oder Paketdownload beim Start. Ein fehlendes Paket führt zu einem Startfehler und wird ausdrücklich über den Paketmanager wiederhergestellt.

Der gebündelte öffentliche Katalog umfasst 32 Tools, acht Ressourcenregistrierungen und drei Prompts einschließlich Komponentenunterlagen, Tokens, Recipes und Templates. Er startet weder Symphony noch eine Datenbank. Authentifizierte Cloud-Studio-Operationen und der modellgestützte Helfer `plan_page` gehören nicht zu dieser öffentlichen lokalen Oberfläche. Der Katalog ist ein Paket-Snapshot; zurückgegebene APIs müssen gegen Symphonys installierte Mosaik-Komponenten (`0.1.199`) geprüft werden. Die zusätzliche Toolabhängigkeit aktualisiert diese Komponenten nicht und beweist keinen aktuellen Cloudstand.

Der lokale Designer verwendet `mosaik` für die verpflichtende Katalogkonsultation und berichtet die tatsächlich konsultierte Paketversion. Nach einem fehlgeschlagenen erforderlichen Aufruf einmal erneut versuchen, den konkreten Fehler berichten und abhängige Designentscheidungen pausieren. Es gibt keinen stillen Web-Fallback. Konfigurationsprüfung, Paketinstallation, erfolgreicher MCP-Handshake und tatsächliche Konsultation der benötigten Tools sind getrennte Nachweise. Die von Codex unterstützten STDIO-Felder `command`, `args` und `cwd` sind in der [offiziellen MCP-Dokumentation](https://learn.chatgpt.com/docs/extend/mcp) beschrieben.

## Versioned Architecture derivation

The local `symphony-architect` declares `metadata.inherits: architect` and explicitly reads `../architect/SKILL.md`. This is an instruction and validation contract rather than native Skill-format inheritance. The local router combines relevant base modules with Symphony references. Generic foundations remain binding; explicit local translations determine their application to actual desktop owners without introducing another framework, transport or database.

The root standard Skills CLI lock records the source repository, `skills/architect/SKILL.md`, a full immutable Git commit in `ref`, and the installed-folder SHA-256 in `computedHash`. The base is committed with the consumer repository, so ordinary work requires neither another project checkout nor network access. The imported directory is excluded from source formatting and must not be edited locally.

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
npx skills add https://github.com/pixel-brewery/skills/tree/<commit>/skills/architect --skill architect --agent codex --copy --yes
```

Review the root lock's immutable `ref`, source and digest. A branch name or floating default branch is not an accepted Architecture pin. Run `yarn agents:sync`, review the local instructions and generated artifacts, then run `yarn agents:check`. Common changes are authored upstream and adopted through a deliberate new pin; local rules remain in their existing local skill references.

## Portable archive contract

`.agents/scripts/package_skills.py` validates each canonical skill and produces deterministic ZIP-compatible `.skill` archives with one matching top-level directory, canonical LF source bytes, fixed timestamps and canonical Unix file attributes. The generated catalog lives at `.agents/packages/skills-lock.json`; it is distinct from the standard root installation lock and never replaces it.

For a declared `metadata.inherits` base, packaging includes that base under `dependencies/<base-name>` inside the derived archive and rewrites included Markdown links to their archive-relative locations. `dependencies/skills-lock.json` carries only the bundled dependencies' native installation entries, retaining their immutable upstream revisions and content digests. Importing `symphony-architect.skill` therefore retains both the foundation and local rules without requiring a sibling skill installation. Missing bases and inheritance cycles fail packaging. Source files remain unchanged by this projection.

Never edit archives, provider mirrors or the portable catalog directly. Run `yarn agents:sync` to regenerate them and `yarn agents:check` to detect drift. These checks prove skill-source integrity and generation consistency; they do not establish a product runtime, browser journey, build, package or release result.

## Public-source privacy guard

`yarn verify:public-content` scans Git-tracked files, including files explicitly
tracked despite ignore rules, and new unignored files. Deleted tracked paths are
ignored. Symlink names/targets are checked without following the link. Ignored
local state and old build/package outputs are outside this public-source scan.

The guard rejects the excluded private project identifier in paths and UTF-8 or
UTF-16LE bytes, including case variants and matches crossing stream boundaries.
It decodes gzip payloads in bounded chunks and ZIP/portable-skill members through
the already required Python standard library. Archive detection uses magic bytes;
ZIP/skill extensions are also inspected. Corrupt archives fail verification. No
archive is extracted or loaded wholly into memory. Diagnostics redact the excluded
identifier even when it appears in a filename. `yarn test:public-content` covers
these contracts and runs in `yarn verify` with the guard.

Canonical skills and guidance remain the editable owners. `yarn agents:sync`
regenerates provider adapters and portable `.skill` archives; never sanitize those
projections by hand or modify the locked Architecture foundation. Private UI
reference comparisons retain their behavior/source contract, but the local
checkout is supplied through `SYMPHONY_REFERENCE_ROOT`; its value and repository
identity must not be committed. Public examples use fictional workspace and
repository identities. Historical raster handoffs with private branding are
excluded; neutral editable HTML and textual workflow contracts remain available.
