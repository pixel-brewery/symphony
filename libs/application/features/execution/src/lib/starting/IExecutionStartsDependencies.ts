// #region Imports

import type {
  ExecutionState,
  IExecutionEvent,
  IExecutionRecord,
  IDeliveryGroup,
  IGoalRecord,
  IImplementationContract,
} from '@symphony/domain-execution';
import type { IWorkflowDefinition, ProcessRole } from '@symphony/domain-workflow';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';
import type { IPreparedWorkspace } from '@symphony/application-workspace';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';
import type { GroupClaimAdmission } from '../claims/GroupClaimAdmission';

// #endregion

/** Capabilities consumed by ExecutionStartService. @public */
export interface IExecutionStartsDependencies {
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadOperationalWorkItems' | 'loadWorkItemDetails' | 'recordWorkItem'
  >;
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'listExecutions' | 'saveExecution'
  >;
  readonly catalog: Pick<
    NonNullable<IAnalyzerDependencies['catalog']>,
    'analysisSkill' | 'workflow' | 'solutionSkill' | 'skill'
  >;
  readonly authorizeLocalExecution?: IAnalyzerDependencies['authorizeLocalExecution'];
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly workspace: Pick<
    NonNullable<IAnalyzerDependencies['workspace']>,
    'prepare' | 'isAvailable'
  >;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly positionPolicyFor?: IAnalyzerDependencies['positionPolicyFor'];
  workflow(): IWorkflowDefinition;
  activeDeliveryGroupForRoot(workItemId: string): IDeliveryGroup | undefined;
  assertStageAllowsRole(item: IWorkItem, role: ProcessRole): void;
  isActive(state: ExecutionState): boolean;
  executionScope(
    workItem: IWorkItem,
    role: SkillFlowRole,
  ): Pick<IExecutionRecord, 'workspaceId' | 'bindingSnapshot'>;
  admitWorkItemClaims(
    items: readonly IWorkItem[],
    action: IWorkItemClaim['action'],
    executionId: string,
    inheritedClaims: readonly IWorkItemClaim[],
    deliveryGroup: IDeliveryGroup | undefined,
  ): Promise<readonly GroupClaimAdmission[]>;
  advanceOnClaim(
    item: IWorkItem,
    role: ProcessRole,
    runId: string,
    claim?: IWorkItemClaim,
  ): Promise<IWorkItem>;
  rollbackAcquiredClaims(admissions: readonly GroupClaimAdmission[]): Promise<void>;
  pauseDeliveryGroup(
    group: IDeliveryGroup,
    pauseReason: NonNullable<IDeliveryGroup['pauseReason']>,
  ): void;
  groupedDeliveryRequest(group: IDeliveryGroup, workItems: readonly IWorkItem[]): string;
  reportRunStarted(item: IWorkItem, role: ProcessRole, executionId: string): void;
  updateGoalExecution(
    execution: IExecutionRecord,
    state: IGoalRecord['state'],
    role: SkillFlowRole,
  ): void;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
  launchExecution(executionId: string, run: (signal: AbortSignal) => Promise<void>): void;
  completeInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  assertNoActiveExecution(item: IWorkItem): void;
  assertNoCriticalPathCollision(workItem: IWorkItem): void;
  retainedImplementationWorkspace(executions: readonly IExecutionRecord[]): Promise<
    | {
        execution: IExecutionRecord;
        workspace: IPreparedWorkspace;
      }
    | undefined
  >;
  goalForWorkItem(workItemId: string): IGoalRecord | undefined;
  implementationContract(execution: IExecutionRecord, analysis: string): IImplementationContract;
  completeSolutionInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    analysis: string,
    feedback: string | undefined,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  reserveExecutionCapacity(): void;
  coordinatesWorkItem(workItem: IWorkItem): boolean;
  acquireWorkItemClaim(
    item: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
  ): Promise<IWorkItemClaim>;
  completeAgenticDiagnosisInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  releaseExecutionCapacity(): void;
}
