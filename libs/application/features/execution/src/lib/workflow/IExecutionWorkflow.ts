// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkflowDefinition, ProcessRole, RunOutcome } from '@symphony/domain-workflow';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';

// #endregion

/** Commands exposed by the single workflow owner. @public */
export interface IExecutionWorkflow {
  reportRunResult(
    item: IWorkItem,
    role: ProcessRole,
    execution: IExecutionRecord,
    outcome: RunOutcome,
    summary: string,
  ): Promise<void>;
  assertStageAllowsRole(item: IWorkItem, role: ProcessRole): void;
  workflow(): IWorkflowDefinition;
  advanceOnClaim(
    item: IWorkItem,
    role: ProcessRole,
    runId: string,
    claim?: IWorkItemClaim,
  ): Promise<IWorkItem>;
  reportRunStarted(item: IWorkItem, role: ProcessRole, executionId: string): void;
}
