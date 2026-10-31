// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { ICiRunHistoryRepository } from '../ports/ICiRunHistoryRepository';

// #endregion

/**
 * Collaborators of the workflow-run history.
 *
 * @public
 */
export interface ICiRunHistoryDependencies {
  /** Durable run record. @public @readonly */
  readonly repository: ICiRunHistoryRepository;
  /** Current instant, which bounds retention and reads. @public @readonly */
  readonly clock: IPlatformClock;
  /**
   * Reports a failed write without failing the refresh that observed the runs.
   *
   * @public
   * @readonly
   */
  readonly reportRecordFailure?: (cause: unknown) => void;
}
