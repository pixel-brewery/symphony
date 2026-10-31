// #region Imports

import type { IBoardColumn } from './IBoardColumn';
import type { ISkillManifest } from '@symphony/domain-skills';
import type { IWorkItemAssignee } from './IWorkItemAssignee';
import type { IWorkItemLabelOption } from './IWorkItemLabelOption';
import type { ProjectFieldDefinition } from './ProjectFieldDefinition';

// #endregion

export interface IWorkItemEditorMetadata {
  repositories: readonly string[];
  /** Provider-native work-item types available for creation in the selected board. */
  workItemTypes?: readonly string[];
  /** Provider-native type preselected for a new work item. */
  defaultWorkItemType?: string;
  labels: readonly IWorkItemLabelOption[];
  assignees: readonly IWorkItemAssignee[];
  states: readonly IBoardColumn[];
  projectFields: readonly ProjectFieldDefinition[];
  issueCreatorSkill?: ISkillManifest;
  analysisSkill?: ISkillManifest;
  solutionSkill?: ISkillManifest;
}
