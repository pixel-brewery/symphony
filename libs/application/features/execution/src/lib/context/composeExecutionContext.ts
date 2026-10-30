// #region Imports

import type { IExecutionBindingSnapshot } from '@symphony/domain-execution';
import type { ISkillManifest } from '@symphony/domain-skills';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';
import type { IExecutionContext } from './IExecutionContext';

// #endregion

export function composeExecutionContext(
  workItem: IWorkItem,
  workflow: IWorkflowDefinition,
  skill: ISkillManifest,
  workspacePath: string,
  workspaceReference?: string,
  continuationReference?: string,
  executionBinding?: IExecutionBindingSnapshot,
): IExecutionContext {
  return {
    workItem,
    workflow,
    skill,
    workspacePath,
    ...(workspaceReference ? { workspaceReference } : {}),
    ...(continuationReference ? { continuationReference } : {}),
    ...(executionBinding ? { executionBinding } : {}),
    instructions: [
      'Inspect repository evidence before forming conclusions.',
      'Do not modify source code during analysis.',
      'Report the complete implementation plan inline in the final message; never as a file, path, or link.',
    ],
  };
}
