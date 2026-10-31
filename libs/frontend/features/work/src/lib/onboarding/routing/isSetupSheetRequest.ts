// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';
import type { ISetupSheetRequest } from '../models/ISetupSheetRequest';

// #endregion

/**
 * Narrows a Settings editor request to the setup sheet's.
 *
 * @param request - Request to check.
 * @returns Whether the request opens the setup sheet.
 * @public
 */
export function isSetupSheetRequest(
  request: ISettingsEditorRequest,
): request is ISetupSheetRequest {
  return (
    request.kind === 'setup' &&
    (request.workspaceId === undefined || typeof request.workspaceId === 'string')
  );
}
