// #region Imports

import type { ExecutionEventCategory, IExecutionBindingSnapshot } from '@symphony/domain-execution';

// #endregion

export interface IAgentProgress {
  readonly message: string;
  readonly category?: ExecutionEventCategory;
  /** Display name of the runtime reporting the progress; the run stream attributes events to it. */
  readonly actor?: string;
  readonly continuationReference?: string;
  readonly resetContinuationReference?: boolean;
  readonly executionBinding?: Pick<
    IExecutionBindingSnapshot,
    | 'agentTeamId'
    | 'positionId'
    | 'agentRoutePolicyId'
    | 'agentRouteCandidateId'
    | 'aiConnectionId'
    | 'agentProfileId'
    | 'model'
    | 'reasoningEffort'
  >;
  readonly tokenUsage?: {
    readonly input: number;
    readonly cachedInput: number;
    readonly output: number;
    readonly total: number;
  };
}
