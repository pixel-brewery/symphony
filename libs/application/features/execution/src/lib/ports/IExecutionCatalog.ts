// #region Imports

import type { ISkillManifest, ISkillPackageDocument, SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';

// #endregion

/** Workflow and skill reads used to execute a selected role. @public */
export interface IExecutionCatalog {
  workflow(): IWorkflowDefinition;
  skills(workspaceId?: string): readonly ISkillManifest[];
  skill(role: SkillFlowRole, workspaceId?: string): ISkillPackageDocument | undefined;
  analysisSkill(workspaceId?: string): ISkillPackageDocument | undefined;
  solutionSkill(workspaceId?: string): ISkillPackageDocument | undefined;
}
