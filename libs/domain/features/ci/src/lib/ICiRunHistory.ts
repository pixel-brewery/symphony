// #region Imports

import type { ICiRun } from './ICiRun';

// #endregion

/**
 * Finished workflow runs Symphony recorded for a workspace scope since an instant, with the
 * instant from which the record is complete.
 *
 * @public
 */
export interface ICiRunHistory {
  /** Recorded finished runs that started at or after the requested instant, newest first. @public @readonly */
  readonly runs: readonly ICiRun[];
  /**
   * The instant from which `runs` is complete: the start of the oldest recorded run of the
   * scope, or of the oldest returned one when the maximum cut the list. Absent when nothing was
   * recorded yet.
   *
   * @public
   * @readonly
   */
  readonly recordedSince?: string;
  /** Whether the maximum cut older runs from the list. @public @readonly */
  readonly truncated: boolean;
}
