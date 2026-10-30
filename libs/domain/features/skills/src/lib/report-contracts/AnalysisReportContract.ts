// #region Imports

import { analysisReportSections } from './AnalysisReportSections';
import { evidenceRule } from './EvidenceRule';
import { formattingRules } from './FormattingRules';
import { inlineDelivery } from './InlineDelivery';
import { sectionList } from './sectionList';

// #endregion

export const analysisReportContract = [
  'Reporting contract - Symphony stores your final message as the analysis and hands that text to the reviewer and to the implementation step.',
  '',
  ...inlineDelivery,
  '- Use Markdown with exactly these level-two sections, in this order:',
  ...sectionList(analysisReportSections),
  '',
  'What each section carries:',
  '',
  '- `## Problem and evidence`: the observable problem or capability gap, the verified cause, the architecture invariant the change repairs or preserves, and the repository evidence that proves it with concrete paths and symbols. Separate verified facts from clearly labeled hypotheses.',
  '- `## Ownership and existing patterns`: the smallest owning path, the existing implementations to reuse, and the paths you deliberately did not use with the reason.',
  '- `## Acceptance criteria`: a flat bullet list of observable, testable criteria. Symphony copies these bullets verbatim into the implementation contract the implementation step is bound to, so write one self-contained criterion per bullet and use no sub-headings and no nested lists.',
  '- `## Change surface`: a Markdown table with the columns `Path`, `Operation`, and `What changes`, one row per file, using repository-relative paths and `create`, `modify`, `delete`, or `rename` as the operation. Close the section with `Collision risk:` naming the paths other active work is likely to touch, or `None`.',
  '- `## Implementation path`: the ordered steps that turn the change surface into working code. This is the section a reviewer reads to decide whether to intervene before any code is written, so it carries the rules below.',
  '- `## Verification plan`: the specific checks that prove the change with their real commands, the required regression or negative proof, and any check only continuous integration can run.',
  '- `## Scope and risks`: included scope, deliberately excluded scope, the primary risk, and its mitigation.',
  '- `## Open decisions`: the decisions that genuinely need a human answer, or `None`.',
  '- `## Definition of ready`: exactly one fenced ```json block, nothing else. Symphony parses this block and its stage guards decide from it whether the work item may advance; an analysis without a valid block cannot advance and is escalated to a person. The block carries: `feasible` (boolean), `ready_for_solve` (boolean; `false` whenever an open decision remains or feasibility is unconfirmed), `unresolved_questions` (array of strings, empty when none; mirror `## Open decisions`), `test_strategy` (non-empty array of strings naming the test kinds from `## Verification plan`), `acceptance_mapping` (one object per bullet of `## Acceptance criteria`: `criterion` verbatim, `implementation_step` as the step number from `## Implementation path`, `verification` naming the proving check), `risk` (`class` one of `low`, `medium`, `high`, `critical`, plus `reasons`; classify the risk of *making this change* - blast radius, reversibility, how much it can break - never the severity of the defect being fixed, and never as a verdict: `ready_for_solve` is the only field that decides whether implementation may begin), and optionally `affected_components`, `likely_change_surface`, `dependencies` (objects with `work_item_id` and `type` `hard` or `soft`), `database_migration_required`, `collision_risk`. State only what the sections above already establish - the block is their machine-readable summary, never new content.',
  '',
  'Rules for `## Implementation path`:',
  '',
  '1. Number the steps in execution order and start every step with the repository-relative path or paths it touches. A step without a path is not a step.',
  '2. Name the operation and what changes inside the file concretely: the function, class, schema key, contract entry, route, column, token, or block. `Update the presenter` and `adjust the tests accordingly` are rejected; name the symbol.',
  '3. Name the acceptance criterion each step serves, so every criterion is reachable through at least one step.',
  '4. Add a `Judgement:` line to a step whenever you chose between materially different viable options. State the option you picked, the one you rejected, and why. This is where a reviewer decides whether to intervene, so never hide a choice inside prose.',
  '5. Add a `Risk:` line to a step that changes a contract, a schema, a migration, a security or tenancy boundary, published behavior, or a shared path.',
  '6. Never write `and related files`, `where needed`, or any other open-ended reference. Every touched file appears in `## Change surface`, and every path in that table appears in at least one step.',
  '',
  ...formattingRules,
  evidenceRule,
].join('\n');
