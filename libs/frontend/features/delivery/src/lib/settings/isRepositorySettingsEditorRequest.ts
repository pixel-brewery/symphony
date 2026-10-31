// #region Imports

import type { IRepositorySettingsEditorRequest } from './IRepositorySettingsEditorRequest';

// #endregion

/** Preserves the existing repository request guard before lazy view loading. @public */
export function isRepositorySettingsEditorRequest(
  request: unknown,
): request is IRepositorySettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'repository' &&
    'workspaceId' in request &&
    typeof request.workspaceId === 'string' &&
    !!request.workspaceId &&
    (!('repositoryBindingId' in request) ||
      request.repositoryBindingId === undefined ||
      typeof request.repositoryBindingId === 'string')
  );
}
