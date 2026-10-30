export interface IWorkflowCounters {
  readonly retriesByReason: Readonly<Record<string, number>>;
  readonly reworksByRoute: Readonly<Record<string, number>>;
  readonly consecutiveIdenticalFailures: number;
  readonly totalRuns: number;
  readonly enteredAt: string;
  /** Hash over the material inputs of the last run; equal hashes indicate a ping-pong loop. */
  readonly lastProgressFingerprint?: string;
}
