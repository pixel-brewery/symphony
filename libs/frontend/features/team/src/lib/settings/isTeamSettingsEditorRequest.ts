// #region Imports

import type { ITeamSettingsEditorRequest } from './ITeamSettingsEditorRequest';

// #endregion

/** Validates the workspace-bound editor request before its component is loaded. @public */
export function isTeamSettingsEditorRequest(
  request: unknown,
): request is ITeamSettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'ai' &&
    'workspaceId' in request &&
    typeof request.workspaceId === 'string' &&
    request.workspaceId.length > 0 &&
    (!('connectionId' in request) ||
      request.connectionId === undefined ||
      typeof request.connectionId === 'string') &&
    (!('agentProfileId' in request) ||
      request.agentProfileId === undefined ||
      typeof request.agentProfileId === 'string')
  );
}
