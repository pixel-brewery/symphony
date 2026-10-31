// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/** Validated source-specific configuration requested by Work's board and account rows. @public */
export interface IWorkSourceSettingsEditorRequest extends ISettingsEditorRequest {
  /** Work owns both existing source editor kinds. @public @readonly */
  readonly kind: 'azure-devops' | 'github-projects';
  /** Workspace whose source will be created or edited. @public @readonly */
  readonly workspaceId: string;
  /** Existing source, omitted when adding a new board. @public @readonly */
  readonly sourceId?: string;
}
