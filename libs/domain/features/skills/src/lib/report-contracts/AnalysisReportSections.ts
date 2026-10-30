/**
 * What an agent has to hand back, per role.
 *
 * Symphony persists an agent's final message as the result of a run and hands it to the reviewer
 * and to the next role. The managed workspace is disposed afterwards, so a report written into a
 * file is unreachable and a result that only points at one carries nothing. Skill packages
 * describe *how* to work; these contracts fix *what* has to come back, and they are appended
 * after the activated skill so they bind regardless of which package an installation selects.
 */

/**
 * Level-two sections every analysis must contain, in this order.
 *
 * `Acceptance criteria` is not decorative: the analyzer extracts that bullet list verbatim into
 * the machine-readable implementation contract the solver is bound to, so a missing section
 * silently degrades that contract to a generic placeholder. `Change surface` and
 * `Implementation path` are what a reviewer reads to decide whether to intervene before any code
 * is written; they carry the strictest rules for that reason.
 */
export const analysisReportSections = [
  'Problem and evidence',
  'Ownership and existing patterns',
  'Acceptance criteria',
  'Change surface',
  'Implementation path',
  'Verification plan',
  'Scope and risks',
  'Open decisions',
  'Definition of ready',
] as const;
