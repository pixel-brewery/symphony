// #region Imports

import type { IExecutionEvent, IExecutionRecord, IGoalRecord } from '@symphony/domain-execution';
import type { ProcessRole, RunOutcome } from '@symphony/domain-workflow';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionLifecycleService. @public */
export interface IExecutionLifecycleDependencies {
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'listExecutions' | 'saveExecution'
  >;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly tracker: Pick<NonNullable<IAnalyzerDependencies['tracker']>, 'listWorkItems'>;
  readonly workspace: Pick<NonNullable<IAnalyzerDependencies['workspace']>, 'isAvailable'>;
  readonly recoveryDelay?: IAnalyzerDependencies['recoveryDelay'];
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadWorkItemDetails'
  >;
  withQueueDrainSuspended<T>(operation: () => Promise<T>): Promise<T>;
  executionCapacity(): {
    maximum: number;
    active: number;
    available: number;
  };
  pendingExecutionStarts(): number;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
  reserveExecutionCapacity(): void;
  releaseExecutionCapacity(): void;
  resumeRequestedOperatorExecutions(): Promise<void>;
  drainExecutionQueue(): Promise<number>;
  isSemanticFailure(summary: string | undefined): boolean;
  finalizeWorkspace(
    execution: IExecutionRecord,
  ): Promise<'released' | 'preserved' | 'unconfirmed' | 'none'>;
  cleanupEligibleWorkspaces(): Promise<void>;
  completeAgenticDiagnosisInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  completeInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  completeSolutionInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    analysis: string,
    feedback: string | undefined,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  reportRunResult(
    item: IWorkItem,
    role: ProcessRole,
    execution: IExecutionRecord,
    outcome: RunOutcome,
    summary: string,
  ): Promise<void>;
  goalForWorkItem(workItemId: string): IGoalRecord | undefined;
  recordFailedGoal(goal: IGoalRecord, failed: IExecutionRecord, error: string): void;
  releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void>;
}
