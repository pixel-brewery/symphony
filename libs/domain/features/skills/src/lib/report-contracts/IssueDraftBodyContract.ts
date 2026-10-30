// #region Imports

import { formattingRules } from './FormattingRules';
import { issueDraftBodySections } from './IssueDraftBodySections';
import { sectionList } from './sectionList';

// #endregion

export const issueDraftBodyContract = [
  'Body contract - the `body` field is the work item a human reads and a later analysis step works from.',
  '',
  '- Write the body in Markdown with exactly these level-two sections, in this order:',
  ...sectionList(issueDraftBodySections),
  '- Keep every section. Write `None` or `Not applicable` when a section genuinely does not apply; never drop one.',
  '- Quote existing user-visible text verbatim inside backticks, in its original language.',
  '',
  'What each section carries:',
  '',
  '- `## Problem`: the observable problem or missing capability, and who it affects.',
  '- `## Current behavior`: what the system does today, as observed.',
  '- `## Expected behavior`: what it should do instead. When user-visible text changes, give the current text and the new text.',
  '- `## Navigation and reproduction`: the concrete navigation path and the numbered steps that reach the behavior, plus the evidence from any supplied screenshot or attachment.',
  '- `## Functional requirements`: what the change must do, one requirement per bullet, free of implementation design.',
  '- `## Failure and empty states`: the error, empty, loading, and offline states the change must handle.',
  '- `## Security and data implications`: authentication, authorization, tenant isolation, secrets, personal data, retention, and deletion impact, or `None`.',
  '- `## Scope and exclusions`: what is included and what is deliberately not included.',
  '- `## Dependencies and consequences`: dependencies on other work items, and the migration, compatibility, event, notification, integration, and documentation consequences the change carries.',
  '- `## Acceptance criteria`: a flat bullet list of observable, testable criteria with no sub-headings and no nested lists. Later steps read this list directly, so each bullet must stand on its own.',
  '- `## Verification expectations`: how a reviewer would confirm the change without reading the diff.',
  '- `## Evidence and open questions`: the confirmed evidence separated from labeled assumptions, and only the decisions that genuinely need a human answer.',
  '',
  ...formattingRules,
  'Do not design an implementation, confirm technical feasibility, or name owning files; the analysis step owns that.',
].join('\n');
