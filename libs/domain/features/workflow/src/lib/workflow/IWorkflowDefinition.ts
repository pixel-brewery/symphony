// #region Imports

import type { IWorkflowPolicies } from './IWorkflowPolicies';
import type { IWorkflowStage } from './IWorkflowStage';
import type { IWorkflowTransition } from './IWorkflowTransition';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

export interface IWorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly initialStageId: WorkflowStageId;
  readonly stages: readonly IWorkflowStage[];
  readonly transitions: readonly IWorkflowTransition[];
  readonly policies: IWorkflowPolicies;
}
