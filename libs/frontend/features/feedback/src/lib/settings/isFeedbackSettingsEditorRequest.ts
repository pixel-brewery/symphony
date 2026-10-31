// #region Imports

import type { IFeedbackSettingsEditorRequest } from './IFeedbackSettingsEditorRequest';

// #endregion

/** Validates Feedback editor input before loading its component. @public */
export function isFeedbackSettingsEditorRequest(
  request: unknown,
): request is IFeedbackSettingsEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'teams-feedback' &&
    'workspaceId' in request &&
    typeof request.workspaceId === 'string' &&
    (!('sourceId' in request) ||
      request.sourceId === undefined ||
      typeof request.sourceId === 'string')
  );
}
