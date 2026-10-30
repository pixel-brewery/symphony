# Instruction Compliance Refactoring

Symphony adopts the FLAMOX365 engineering instructions (`../flamox/.github/instructions/*`) as
binding for its own source. This document is the program plan: the goal, the interpretation of
each rule for this repository, the phase order, and the exit criteria.

## Goal

`node tools/instruction-compliance.mjs --strict` exits 0, and `yarn verify` plus `yarn e2e`
stay green throughout. Compliance is machine-checked, not asserted.

## Scoreboard

`tools/instruction-compliance.mjs` is the single source of truth for progress. It audits every
`.ts` file under `apps/`, `libs/` and `tools/` against 18 machine-checkable rules and prints a
per-rule violation count. `--rule=<id>` lists the offenders, `--json` feeds tooling, and
`--strict` turns the audit into a gate.

`yarn instruction:check` runs that gate as part of `yarn verify`. It is a **ratchet**, not a
cliff: `tools/instruction-compliance.baseline.json` pins every completed rule at zero and caps
the rules still being migrated at their current count, so compliance can only improve.
`yarn instruction:check --update-baseline` locks in a gain.

Package-entry barrels include `export type` declarations; the checker classifies them as re-exports rather than additional production declarations. Generated Angular library lint configuration follows the existing mobile app's base-before-Angular parser order and Symphony selector prefix. Its `prefer-inject` recommendation is disabled because the binding repository contract requires constructor injection at application/provider boundaries; component and presenter field injection remains supported.

| Rule                           | Baseline |   Now |
| ------------------------------ | -------: | ----: |
| `imports-region`               |      420 | **0** |
| `import-contiguous`            |        1 | **0** |
| `single-export`                |      127 | **0** |
| `file-name-pascal-case`        |      136 | **0** |
| `file-name-matches-export`     |        6 | **0** |
| `interface-i-prefix`           |      333 | **0** |
| `private-field-underscore`     |      409 | **0** |
| `private-method-no-underscore` |        0 | **0** |
| `member-access-modifier`       |        0 | **0** |
| `class-regions`                |      238 | **0** |
| `no-any`                       |        2 | **0** |
| `no-arrow-method`              |        6 | **0** |
| `tsdoc-public-member`          |     1507 | **0** |
| `view-triple-file`             |       68 | **0** |
| `presenter-command-only`       |      435 | **0** |
| `spec-file-matches-source`     |      n/a | **0** |
| `spec-aaa-markers`             |      390 | **0** |
| **Total**                      | **4078** | **0** |

The file count grew from 465 to about 1900 as multi-export modules became one-export-per-file
units; no exported symbol was lost, which is verified by diffing the export surface against
`HEAD`.

## Codemods

The refactoring is reproducible rather than hand-applied. Each tool is idempotent and driven by
the TypeScript AST, and several are driven by the compiler's own diagnostics:

| Tool                                             | Purpose                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `tools/instruction-compliance.mjs`               | The audit and the `--strict` ratchet gate                                  |
| `tools/codemods/split-module.mjs`                | Splits a multi-export module into one-export-per-file units plus a barrel  |
| `tools/codemods/rename-symbols.mjs`              | AST rename that only touches files importing or declaring the symbol       |
| `tools/codemods/rewrite-imports.mjs`             | Repoints relative imports and re-exports after files move or split         |
| `tools/codemods/repair-imports.mjs`              | Diagnostic-driven repair of broken imports and barrels                     |
| `tools/codemods/fix-type-only-imports.mjs`       | Moves value imports out of a collapsed `import type`                       |
| `tools/codemods/hoist-internal-declarations.mjs` | Orders file-local helpers before their consumer                            |
| `tools/codemods/normalize-file-names.mjs`        | Renames modules to match their export, with collision detection            |
| `tools/codemods/apply-file-conventions.mjs`      | Import region, private-field prefix, class regions                         |
| `tools/codemods/apply-tsdoc.mjs`                 | TSDoc blocks with access tags, preserving existing prose                   |
| `tools/codemods/apply-view-triple.mjs`           | Gives every View its `.html` and `.scss` siblings                          |
| `tools/codemods/apply-spec-aaa.mjs`              | AAA markers, naming the Act out of fused assertions                        |
| `tools/codemods/apply-presenter-commands.mjs`    | Migrates public presenter methods to Commands, signals, or private helpers |

## Rule interpretation for Symphony

The FLAMOX365 instructions target a NestJS + Angular product. Symphony is an Electron
three-process desktop application. The rules are adopted as follows.

**Adopted verbatim.** One public export per file; PascalCase file names matching the export;
`I` prefix on interfaces; `_` prefix on private fields and no `_` on private methods; explicit
access modifiers; `// #region Imports` plus `Fields -> Ctor -> Properties -> Methods` class
regions; contiguous imports; TSDoc with access tags on public members; no `any`; methods as
real functions; three-file View units; the Command pattern on ViewPresenters; signal forms;
Tailwind-plus-Mosaik-token styling; AAA markers and behavioural naming in specs; exact production
file basenames for unit, integration and contract specs; `test-id` selectors. Behaviour-named E2E
journeys and repository-policy/tooling specs remain explicit multi-file exceptions.

**Adapted.** Ports stay abstract contracts in `libs/application`, bound in the orchestrator
composition root rather than by a NestJS container. "No `process.env` outside configuration"
maps onto the `SYMPHONY_*` env surface owned by `libs/configuration` and the composition root.

**Not applicable.** `api-guidelines` (`libs/backend/**`, REST URL shapes), the Prisma,
PostgreSQL, Swagger/OpenAPI, Supertest, Helmet/CORS and NestJS module rules, and the
`gen:api` contract pipeline: Symphony has no HTTP backend and no ORM. The Draft-First creation
pattern is a backend entity-lifecycle rule with no Symphony counterpart. `caveman` is an
opt-in communication mode, not a code standard, and is left inactive.

**Conflicts resolved in favour of the instructions.** `CLAUDE.md` previously stated that
renderer Views carry no SCSS file. The View-isolation rule wins: every `@Component` View owns
sibling `.ts`, `.html` and `.scss` files. Backend-side kebab-case file names are replaced by
PascalCase names matching the exported symbol. Both documents are updated to match.

## Phase order

Phases were ordered so that structure settled before formatting, and so that each phase ended on
a green `yarn typecheck`.

1. **Tooling** - done. Auditor, split, rename, rewrite and repair codemods.
2. **Naming** - done. `I` prefix across 333 exported and 137 file-local interfaces; `_` prefix on
   private fields (`protected` members stay unprefixed because Angular templates bind to them).
3. **Structure** - done. 127 multi-export modules split into one-export-per-file units; 296 files
   renamed to match their export.
4. **File conventions** - done. Import regions, class regions, TSDoc, `any` and arrow-method
   removal.
5. **Renderer** - done. `Command`, `AsyncCommand`, and `CommandDirective` live in
   `libs/frontend/core/src/commands/`, and `MenuBarViewPresenter` remains the reference
   implementation verified by `apps/renderer-e2e/src/menu-bar.spec.ts`. The final 404 public
   presenter methods across 22 files were migrated with the AST-driven presenter codemod.
6. **Tests** - done. AAA markers across all spec files, with fused `expect(fn(x))` assertions
   restructured so each test has one clear Act. Unit, integration and contract specs use the exact
   basename of their production file; former multi-owner suites are split along production-file
   boundaries.
7. **Enforcement** - done. `yarn instruction:check` runs inside `yarn verify`.

## Completed: the Command pattern

The last 404 public ViewPresenter methods were classified by actual template and TypeScript
references before rewriting. Each group moved to its owning presentation construct:

| Group                           | Count | Destination                                                                                |
| ------------------------------- | ----: | ------------------------------------------------------------------------------------------ |
| Externally invoked actions      |   250 | A private `Command` field, a public getter, and a private `onExecute<Name>Command` handler |
| Externally read projections     |   131 | A read-only computed signal getter backed by a private resolver                            |
| Internal implementation methods |    23 | `private`, while documented lifecycle and behaviour extension points remain public         |

`MenuBarViewPresenter` and `MenuBarView` show the finished shape: eight commands plus one derived
signal (`latestProgressByExecution`) replace method calls on the public presenter surface. Other
Views consume the same command objects either through `CommandDirective` or by invoking
`Command.execute` from an existing compound template interaction. Parameterized projections are
read as signals before applying their view-local parameter.

## Verification

Each phase ends with `yarn typecheck`; each group of phases ends with `yarn lint`, `yarn test`
and `yarn build`. The renderer phase additionally requires `yarn e2e`. Release-candidate
evidence follows the existing order in `CLAUDE.md`.
