// #region Imports

import type {
  IExecutionEvent,
  IExecutionRecord,
  IGoalRecord,
  IImplementationContract,
  IGoalVerificationReport,
} from '@symphony/domain-execution';
import type { ProcessRole, RunOutcome } from '@symphony/domain-workflow';
import type { IWorkItem, IWorkItemClaim, IWorkItemNote } from '@symphony/domain-work';
import type { AgentInterruptionError } from '@symphony/application-ai';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';
import type { IPullRequestReference } from '@symphony/domain-delivery';

// #endregion

/** Capabilities consumed by ExecutionRunService. @public */
export interface IExecutionRunsDependencies {
  readonly catalog: Pick<
    NonNullable<IAnalyzerDependencies['catalog']>,
    'workflow' | 'skill' | 'skills'
  >;
  readonly agent: Pick<NonNullable<IAnalyzerDependencies['agent']>, 'analyze' | 'solve'>;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly repository: Pick<NonNullable<IAnalyzerDependencies['repository']>, 'saveExecution'>;
  readonly workspace: Pick<NonNullable<IAnalyzerDependencies['workspace']>, 'inspectChanges'>;
  readonly verifyImplementation?: IAnalyzerDependencies['verifyImplementation'];
  readonly maximumVerificationRepairAttempts?: IAnalyzerDependencies['maximumVerificationRepairAttempts'];
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly delivery?: Pick<NonNullable<IAnalyzerDependencies['delivery']>, 'publishPullRequest'>;
  readonly agenticDeliveryRecovery: Pick<
    NonNullable<IAnalyzerDependencies['agenticDeliveryRecovery']>,
    'listAgenticDeliveries' | 'saveAgenticDelivery'
  >;
  latestExecution(executionId: string): IExecutionRecord;
  advanceClaimForResult(
    claim: IWorkItemClaim,
    action: IWorkItemClaim['action'],
    executionId?: string,
  ): Promise<IWorkItemClaim>;
  reportRunResult(
    item: IWorkItem,
    role: ProcessRole,
    execution: IExecutionRecord,
    outcome: RunOutcome,
    summary: string,
  ): Promise<void>;
  goalForWorkItem(workItemId: string): IGoalRecord | undefined;
  recordAnalysisGoal(goal: IGoalRecord, completed: IExecutionRecord, summary: string): void;
  finalizeWorkspace(
    execution: IExecutionRecord,
  ): Promise<'released' | 'preserved' | 'unconfirmed' | 'none'>;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
  publishNote(item: IWorkItem, executionId: string | undefined, note: IWorkItemNote): Promise<void>;
  finishAbortedExecution(execution: IExecutionRecord): Promise<void>;
  waitForReactivation(
    execution: IExecutionRecord,
    cause: AgentInterruptionError,
    signal: AbortSignal,
  ): Promise<IExecutionRecord | undefined>;
  finishFailedExecution(
    execution: IExecutionRecord,
    cause: unknown,
    fallback: string,
  ): Promise<void>;
  effectiveImplementationContract(
    execution: IExecutionRecord,
    goal: IGoalRecord | undefined,
    analysis: string,
  ): IImplementationContract;
  recordVerifiedGoal(
    goal: IGoalRecord,
    current: IExecutionRecord,
    contract: IImplementationContract,
    verificationReport: IGoalVerificationReport,
    failures: readonly string[],
    repairing: boolean,
  ): void;
  synchronizeDeliveryGroupPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    pullRequest: IPullRequestReference,
  ): Promise<void>;
  releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void>;
  implementationNote(execution: IExecutionRecord, summary: string): IWorkItemNote;
  recordGoalHandoff(
    goal: IGoalRecord,
    executionId: string,
    previousAgentId: string,
    nextAgentId: string,
    changeSet: {
      readonly changedFiles: readonly string[];
    },
    now: string,
  ): void;
}
