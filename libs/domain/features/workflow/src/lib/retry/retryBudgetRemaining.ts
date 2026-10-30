// #region Imports

import type { IRetryPolicy } from '../workflow/IRetryPolicy';

// #endregion

/** Whether another automatic attempt is permitted for this reason. */
export function retryBudgetRemaining(policy: IRetryPolicy, attemptsForReason: number): boolean {
  return attemptsForReason < policy.maxAttemptsPerReason;
}
