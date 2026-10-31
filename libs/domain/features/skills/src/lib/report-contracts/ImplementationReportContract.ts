// #region Imports

import { evidenceRule } from './EvidenceRule';
import { formattingRules } from './FormattingRules';
import { implementationReportSections } from './ImplementationReportSections';
import { inlineDelivery } from './InlineDelivery';
import { sectionList } from './sectionList';

// #endregion

export const implementationReportContract = [
  'Reporting contract - Symphony stores your final message as the implementation report and hands that text to the reviewer and to the independent verification step.',
  '',
  ...inlineDelivery,
  '- Use Markdown with exactly these level-two sections, in this order:',
  ...sectionList(implementationReportSections),
  '',
  'What each section carries:',
  '',
  '- `## Result`: one statement of the outcome in user or domain terms, not a list of edits.',
  '- `## Changed files`: a Markdown table with the columns `Path`, `Operation`, and `What changed`, one row per file you actually changed. The table must match the real diff; never list a file you did not touch and never omit one you did.',
  '- `## Implemented behavior`: the material behavior changes, the permission, validation, state-transition, and compatibility behavior they carry, and the negative path you protected or the absence of side effects you proved.',
  '- `## Acceptance assessment`: one bullet per acceptance criterion from the approved analysis, each prefixed `Satisfied`, `Adjusted`, `Already satisfied`, or `Not satisfied`, followed by the criterion and the evidence you observed for that verdict.',
  '- `## Deviations from the plan`: every file, step, or decision that differs from the approved analysis, with the reason it was necessary, or `None` when the plan held.',
  '- `## Verification`: the checks you actually ran, each with its real command and its real result, plus the checks only continuous integration can run named as pending. Never report a check you did not run, and never declare your own work verified; an independent step decides that.',
  '- `## Documentation and integration consequences`: documentation, contracts, events, notifications, and localization - each either the updated location or a concrete reason why no change was required.',
  '- `## Review notes`: where a reviewer should look first, or `No additional review notes.`',
  '',
  ...formattingRules,
  evidenceRule,
].join('\n');
