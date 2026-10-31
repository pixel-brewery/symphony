export interface IRetryPolicy {
  /** Backoff schedule in minutes, one entry per attempt. The last entry repeats. */
  readonly backoffMinutes: readonly number[];
  /** Random share added to each delay, 0–1. */
  readonly jitterRatio: number;
  /** Attempts per reason code before the item escalates to a person. */
  readonly maxAttemptsPerReason: number;
}
