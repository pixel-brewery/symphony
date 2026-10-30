/**
 * Reports capacity, selected work and agentic-delivery outcomes from one autonomous cycle.
 *
 * @public
 */
export interface IAutonomousCycleResult {
  observed: number;
  excluded: number;
  active: number;
  capacity: number;
  /** Waiting steps this cycle started before considering any new work. */
  queueStarted: number;
  /** Waiting steps that still have no slot when the cycle ends. */
  queuePending: number;
  reviewed: number;
  completed: number;
  startedAnalyses: number;
  startedSolutions: number;
  retried: number;
  deferred: number;
  failed: number;
  agenticObserved: number;
  agenticDiagnoses: number;
  agenticRepairs: number;
  agenticReruns: number;
  agenticBranchUpdates: number;
  failureSamples: readonly {
    readonly workItemId: string;
    readonly externalId: string;
    readonly message: string;
  }[];
}
