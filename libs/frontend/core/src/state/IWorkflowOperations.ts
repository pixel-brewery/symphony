// #region Imports

import type { Signal } from '@angular/core';
import type { WorkflowProcessDto } from '@symphony/ipc-contracts-workflow';

// #endregion

/** Workflow operations consumed by composition and Work surfaces. @public */
export interface IWorkflowOperations {
  readonly workflowBusy: Signal<boolean>;
  loadWorkflowProcess(workItemId: string): Promise<WorkflowProcessDto | undefined>;
  decideWorkflow(workItemId: string, optionId: string, note?: string): Promise<void>;
  answerWorkflowQuestion(
    workItemId: string,
    questionId: string,
    option?: string,
    note?: string,
  ): Promise<void>;
}
