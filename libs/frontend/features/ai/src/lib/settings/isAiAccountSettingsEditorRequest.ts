// #region Imports

import type { IAiAccountSettingsEditorRequest } from './IAiAccountSettingsEditorRequest';

// #endregion

/** Validates the workspace-bound editor request before its component is loaded. @public */
export function isAiAccountSettingsEditorRequest(
  request: unknown,
): request is IAiAccountSettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'ai-account' &&
    'workspaceId' in request &&
    typeof request.workspaceId === 'string' &&
    request.workspaceId.length > 0 &&
    (!('connectionId' in request) ||
      request.connectionId === undefined ||
      typeof request.connectionId === 'string') &&
    (!('runtime' in request) ||
      request.runtime === undefined ||
      request.runtime === 'codex' ||
      request.runtime === 'claude' ||
      request.runtime === 'opencode')
  );
}
