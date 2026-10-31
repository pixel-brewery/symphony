// #region Imports
import type { ISkillImportEditorRequest } from './ISkillImportEditorRequest';
// #endregion
/** Validates the same import intent before loading the feature-owned drawer. @public */
export function isSkillImportEditorRequest(request: unknown): request is ISkillImportEditorRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    'kind' in request &&
    request.kind === 'skill-import'
  );
}
