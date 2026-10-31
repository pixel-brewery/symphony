// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/**
 * Request for the Workspace-owned create and rename drawer.
 *
 * @public
 */
export interface IWorkspaceSettingsEditorRequest extends ISettingsEditorRequest {
  /**
   * Stable existing workspace editor kind.
   *
   * @public
   * @readonly
   */
  readonly kind: 'workspace';
  /**
   * Existing workspace; omitted when creating a workspace.
   *
   * @public
   * @readonly
   */
  readonly workspaceId?: string;
}
