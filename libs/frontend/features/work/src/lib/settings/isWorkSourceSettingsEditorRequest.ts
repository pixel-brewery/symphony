// #region Imports

import type { IWorkSourceSettingsEditorRequest } from './IWorkSourceSettingsEditorRequest';

// #endregion

/** Rejects malformed or cross-feature requests before a Work source drawer is loaded. @public */
export function isWorkSourceSettingsEditorRequest(
  request: unknown,
): request is IWorkSourceSettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    (request.kind === 'azure-devops' || request.kind === 'github-projects') &&
    'workspaceId' in request &&
    typeof request.workspaceId === 'string' &&
    !!request.workspaceId &&
    (!('sourceId' in request) ||
      request.sourceId === undefined ||
      typeof request.sourceId === 'string')
  );
}
