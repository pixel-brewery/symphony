// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/** The unchanged existing repository editor request. @public */
export interface IRepositorySettingsEditorRequest extends ISettingsEditorRequest {
  readonly kind: 'repository';
  readonly workspaceId: string;
  readonly repositoryBindingId?: string;
}
