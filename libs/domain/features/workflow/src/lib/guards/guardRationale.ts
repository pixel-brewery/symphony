// #region Imports

import type { IGuardEvaluation } from '../workflow/IGuardEvaluation';

// #endregion

/**
 * The human-readable reason a transition was refused.
 *
 * Guards that fail for one shared cause report one shared sentence, so repetitions are
 * collapsed rather than read back to the operator once per guard.
 */
export function guardRationale(evaluation: IGuardEvaluation): string {
  return [...new Set(evaluation.failed.map((failure) => failure.detail))].join(' ');
}
