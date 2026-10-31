// #region Imports

import type { IRetryPolicy } from '../workflow/IRetryPolicy';
import type { JitterSource } from './JitterSource';

// #endregion

/**
 * Delay in milliseconds before attempt `attempt` may start again. Attempts are one-based;
 * the last configured step repeats for every further attempt.
 */
export function retryDelayMilliseconds(
  policy: IRetryPolicy,
  attempt: number,
  jitter: JitterSource,
): number {
  const schedule = policy.backoffMinutes;
  if (schedule.length === 0) return 0;
  const index = Math.min(Math.max(attempt, 1), schedule.length) - 1;
  const baseMilliseconds = (schedule[index] ?? 0) * 60_000;
  const ratio = Math.min(Math.max(policy.jitterRatio, 0), 1);
  const share = Math.min(Math.max(jitter(), 0), 1);
  return Math.round(baseMilliseconds * (1 + ratio * share));
}
