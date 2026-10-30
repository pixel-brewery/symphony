// #region Imports

import type { IAgentWork } from './IAgentWork';

// #endregion

/** Actual work projected for one employee, independent from their execution provider. */
export interface IAgentActivity {
  readonly agentId: string;
  readonly state:
    | 'idle'
    | 'queued'
    | 'working'
    | 'needs-input'
    | 'paused'
    | 'blocked'
    | 'completed'
    | 'failed'
    | 'stale';
  readonly work: readonly IAgentWork[];
  readonly lastKnownAt?: string;
}
