// #region Imports

import type {
  IExecutionEvent,
  IExecutionRecord,
  IGoalRecord,
  IGoalVerificationReport,
} from '@symphony/domain-execution';
import type { ProcessRole, RunOutcome } from '@symphony/domain-workflow';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkItem, IWorkItemNote } from '@symphony/domain-work';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ManualExecutionService. @public */
export interface IManualExecutionsDependencies {
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadOperationalWorkItems' | 'loadWorkItemDetails'
  >;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly catalog: Pick<NonNullable<IAnalyzerDependencies['catalog']>, 'workflow'>;
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'saveExecution' | 'listExecutions'
  >;
  assertStageAllowsRole(item: IWorkItem, role: ProcessRole): void;
  assertNoActiveExecution(item: IWorkItem): void;
  executionScope(
    workItem: IWorkItem,
    role: SkillFlowRole,
  ): Pick<IExecutionRecord, 'workspaceId' | 'bindingSnapshot'>;
  reportRunResult(
    item: IWorkItem,
    role: ProcessRole,
    execution: IExecutionRecord,
    outcome: RunOutcome,
    summary: string,
  ): Promise<void>;
  goalForWorkItem(workItemId: string): IGoalRecord | undefined;
  recordManualAnalysisGoal(
    manualGoal: IGoalRecord,
    execution: IExecutionRecord,
    normalizedSummary: string,
    now: string,
  ): void;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
  publishNote(item: IWorkItem, executionId: string | undefined, note: IWorkItemNote): Promise<void>;
  recordManualSolutionGoal(
    manualGoal: IGoalRecord,
    execution: IExecutionRecord,
    verificationReport: IGoalVerificationReport,
    now: string,
  ): void;
  implementationNote(execution: IExecutionRecord, summary: string): IWorkItemNote;
}
