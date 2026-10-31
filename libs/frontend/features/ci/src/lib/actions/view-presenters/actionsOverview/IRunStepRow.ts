// #region Imports

import type { CiRunLogState } from '@symphony/domain-ci';

// #endregion

/**
 * One line of the selected run's step list: a job heading when the run has several jobs, or a
 * step.
 *
 * @public
 */
export interface IRunStepRow {
  /** Job or step id. @public @readonly */
  readonly id: string;
  /** Whether the line is a job heading or a step. @public @readonly */
  readonly kind: 'job' | 'step';
  /** Job or step name. @public @readonly */
  readonly name: string;
  /** Reported state. @public @readonly */
  readonly status: CiRunLogState;
  /** Start time. @public @readonly */
  readonly startedAt?: string;
  /** Finish time. @public @readonly */
  readonly finishedAt?: string;
  /** Whether the step sits under a job heading. @public @readonly */
  readonly nested: boolean;
}
