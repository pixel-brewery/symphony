// #region Imports

import type { IExecutionBindingSnapshot } from '@symphony/domain-execution';
import type { ISkillManifest } from '@symphony/domain-skills';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

export interface IExecutionContext {
  workItem: IWorkItem;
  workflow: IWorkflowDefinition;
  skill: ISkillManifest;
  workspacePath: string;
  workspaceReference?: string;
  continuationReference?: string;
  executionBinding?: IExecutionBindingSnapshot;
  instructions: readonly string[];
}
