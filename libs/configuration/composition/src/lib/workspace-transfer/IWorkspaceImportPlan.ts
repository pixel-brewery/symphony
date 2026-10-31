// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { IEditableSkillPackage } from '@symphony/domain-skills';

// #endregion

export interface IWorkspaceImportPlan {
  readonly settings: IApplicationSettings;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly replaced: boolean;
  readonly requiredConnectionIds: readonly string[];
  readonly repositoryBindingIds: readonly string[];
  readonly skills: readonly IEditableSkillPackage[];
}
