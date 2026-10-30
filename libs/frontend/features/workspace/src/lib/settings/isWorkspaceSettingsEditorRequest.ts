// #region Imports

import type { IWorkspaceSettingsEditorRequest } from './IWorkspaceSettingsEditorRequest';

// #endregion

/**
 * Validates Workspace editor input before its component is loaded.
 *
 * @public
 */
export function isWorkspaceSettingsEditorRequest(
  request: unknown,
): request is IWorkspaceSettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'workspace' &&
    (!('workspaceId' in request) ||
      request.workspaceId === undefined ||
      typeof request.workspaceId === 'string')
  );
}
