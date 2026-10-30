// #region Imports

import type { IGuardFailure } from './IGuardFailure';

// #endregion

/** Outcome of evaluating the guards of one transition. */
export interface IGuardEvaluation {
  readonly satisfied: boolean;
  readonly failed: readonly IGuardFailure[];
}
