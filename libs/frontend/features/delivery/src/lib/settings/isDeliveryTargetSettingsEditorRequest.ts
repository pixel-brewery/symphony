// #region Imports

import type { IDeliveryTargetSettingsEditorRequest } from './IDeliveryTargetSettingsEditorRequest';

// #endregion

/** Preserves the existing destination request guard before lazy view loading. @public */
export function isDeliveryTargetSettingsEditorRequest(
  request: unknown,
): request is IDeliveryTargetSettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'delivery-target' &&
    'workspaceId' in request &&
    typeof request.workspaceId === 'string' &&
    !!request.workspaceId &&
    'repositoryBindingId' in request &&
    typeof request.repositoryBindingId === 'string' &&
    !!request.repositoryBindingId &&
    (!('targetId' in request) ||
      request.targetId === undefined ||
      typeof request.targetId === 'string')
  );
}
