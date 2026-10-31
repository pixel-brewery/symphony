// #region Imports

import type { IRetryPolicy } from '../workflow/IRetryPolicy';
import type { JitterSource } from './JitterSource';
import { retryDelayMilliseconds } from './retryDelayMilliseconds';

// #endregion

/** Absolute instant at which the next attempt becomes eligible. */
export function nextRetryAt(
  policy: IRetryPolicy,
  attempt: number,
  now: Date,
  jitter: JitterSource,
): Date {
  return new Date(now.getTime() + retryDelayMilliseconds(policy, attempt, jitter));
}
