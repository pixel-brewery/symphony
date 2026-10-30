// #region Imports

import type { IExecutionQueueEntry, IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IExecutionTrigger as IAutomationExecutionTrigger } from '../ports/IExecutionTrigger';
import type { ExecutionAdmission } from '../analyzer/ExecutionAdmission';

// #endregion

/** Commands exposed by the single admission owner. @public */
export interface IExecutionAdmission {
  executionCapacity(): {
    maximum: number;
    active: number;
    available: number;
  };
  listExecutionQueue(): readonly IExecutionQueueEntry[];
  requestAnalysis(
    simulateFailure: boolean,
    workItemId?: string,
    request?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<ExecutionAdmission>;
  requestSolution(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<ExecutionAdmission>;
  removeExecutionQueueEntry(entryId: string): IExecutionQueueEntry;
  drainExecutionQueue(): Promise<number>;
  pendingExecutionStarts(): number;
  releaseExecutionCapacity(): void;
  start(
    simulateFailure: boolean,
    workItemId?: string,
    request?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord>;
  startSolution(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord>;
  startForWorkItem(
    workItem: IWorkItem,
    request?: string,
    automationTrigger?: IAutomationExecutionTrigger,
  ): Promise<IExecutionRecord>;
  startSolutionForWorkItem(
    workItem: IWorkItem,
    feedback?: string,
    automationTrigger?: IAutomationExecutionTrigger,
  ): Promise<IExecutionRecord>;
  withQueueDrainSuspended<T>(operation: () => Promise<T>): Promise<T>;
  reserveExecutionCapacity(): void;
  resumeRequestedOperatorExecutions(): Promise<void>;
  assertNoActiveExecution(item: IWorkItem): void;
}
