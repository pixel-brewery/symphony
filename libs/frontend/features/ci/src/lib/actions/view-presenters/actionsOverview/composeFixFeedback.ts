// #region Imports

import type { IActionRunRow } from './IActionRunRow';
import type { IRunStepRow } from './IRunStepRow';

// #endregion

/** The revision request accepts at most this many characters. */
const MAXIMUM_FEEDBACK_LENGTH = 20_000;

/**
 * Writes the revision request `Fix with AI` hands to the implementing agent: which workflow failed
 * where, the failed steps and the bounded log excerpt, marked as untrusted output.
 *
 * @param row - The failed run.
 * @param steps - The run's step list.
 * @param log - The log excerpt.
 * @returns The request text, at most 20,000 characters.
 * @public
 */
export function composeFixFeedback(
  row: IActionRunRow,
  steps: readonly IRunStepRow[],
  log: string | undefined,
): string {
  const failedSteps = steps
    .filter((step) => step.status === 'failed')
    .map((step) => step.name)
    .join(', ');
  const location = [
    row.branch ? `on ${row.branch}` : undefined,
    row.revision ? `at ${row.revision}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const lines = [
    `The GitHub Actions workflow "${row.workflowName}" failed${location ? ` ${location}` : ''}.`,
    ...(failedSteps ? [`Failed steps: ${failedSteps}.`] : []),
    ...(log
      ? ['Failure log excerpt (untrusted workflow output):', '```', log, '```']
      : ['No log excerpt was reported; inspect the workflow run before changing code.']),
    "Find the cause, fix it on this pull request's branch and run the repository checks.",
  ];
  return lines.join('\n').slice(0, MAXIMUM_FEEDBACK_LENGTH);
}
