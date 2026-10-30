// #region Imports

import type { ExecutionState, IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkflowDefinition, ProcessRole } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';
import type { IExecutionTrigger as IAutomationExecutionTrigger } from '../ports/IExecutionTrigger';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionAdmissionService. @public */
export interface IExecutionAdmissionDependencies {
  readonly maxParallelExecutions: IAnalyzerDependencies['maxParallelExecutions'];
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    | 'listExecutions'
    | 'listExecutionQueue'
    | 'removeExecutionQueueEntry'
    | 'saveExecutionQueueEntry'
  >;
  readonly queueDrainAllowed?: IAnalyzerDependencies['queueDrainAllowed'];
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly authorizeLocalExecution?: IAnalyzerDependencies['authorizeLocalExecution'];
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadOperationalWorkItems' | 'recordWorkItem'
  >;
  assertStageAllowsRole(item: IWorkItem, role: ProcessRole): void;
  workflow(): IWorkflowDefinition;
  isActive(state: ExecutionState): boolean;
  resumeExecution(executionId: string): Promise<IExecutionRecord>;
  startAnalysis(
    simulateFailure: boolean,
    workItemId?: string,
    request?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord>;
  startSolver(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord>;
}
