// #region Imports
import type { ISettingsEditorRequest } from '@symphony/frontend-setting';
// #endregion
/** Addresses the existing portable Skill import drawer. @public */
export interface ISkillImportEditorRequest extends ISettingsEditorRequest {
  readonly kind: 'skill-import';
}
