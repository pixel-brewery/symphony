# Execution-context composition

Context composition joins four independently owned inputs: normalized work item, selected versioned workflow, resolved skill manifest, and isolated workspace path. It then adds platform invariants such as evidence-first inspection, source immutability during analysis, and structured-result persistence.

The bootstrap `composeExecutionContext` returns a typed immutable value consumed by `AgentRuntimePort`. This prevents agent adapters from reaching into tracker or workflow services and makes prompt construction testable. Production composition will layer repository `AGENTS.md`, applicable skills, project policy, attachments, prior workpad content, allowed commands, quality-gate profile, and a strict structured-output schema. Each layer will carry provenance and size accounting; secrets will be mediated separately and never included in persisted context.

## Reporting contracts

`libs/domain/features/skills/src/lib/report-contracts/` fixes what each role has to hand back. Every provider appends the matching contract after the activated skill package, so it binds regardless of which package an installation selects and which agent CLI executes the run. The pure context composer belongs to `libs/application/features/execution/src/lib/context/`; Node-only package discovery and hashing belong to `libs/providers/filesystem/`.

| Role    | Contract                       | Sections                                                                                                                                                                             |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create  | `issueDraftBodyContract`       | the twelve sections of the drafted work-item body, from `Problem` to `Evidence and open questions`                                                                                   |
| Analyze | `analysisReportContract`       | `Problem and evidence`, `Ownership and existing patterns`, `Acceptance criteria`, `Change surface`, `Implementation path`, `Verification plan`, `Scope and risks`, `Open decisions`  |
| Solve   | `implementationReportContract` | `Result`, `Changed files`, `Implemented behavior`, `Acceptance assessment`, `Deviations from the plan`, `Verification`, `Documentation and integration consequences`, `Review notes` |

Three consequences make these contracts rather than style guides.

The managed workspace is disposed once a run finishes, so a report an agent writes into a file is unreachable afterwards and a result that only points at one carries nothing. The analyzer therefore rejects a short analysis that references a document and fails the execution instead of storing it.

`Acceptance criteria` is parsed. Its bullets are copied verbatim into the machine-readable implementation contract the solver is bound to, so a missing or nested section degrades that contract to a generic placeholder. The same heading in the drafted work-item body is what the analysis step starts from.

`Change surface` and `Implementation path` exist for human review. Together they answer what changes and where before any code is written: one table row per file, one numbered step per change, each step anchored to a repository-relative path and to the acceptance criterion it serves, with `Judgement:` marking a choice between materially different options and `Risk:` marking a contract, schema, migration, or boundary change. `Deviations from the plan` in the implementation report closes the loop against that declared surface.

All three contracts share one formatting block, aligned with what `symphony-markdown` actually renders: GitHub-flavored Markdown through `marked`, raw HTML escaped, and `h3` through `h6` styled identically. Results therefore start at the first required heading with no document title, nest at most one level below `##`, carry paths and commands in backticks, use tables only where a contract asks for one, and avoid HTML, emoji, and decorative rules.
