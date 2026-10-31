// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';

// #endregion

/**
 * Opens the instructions sheet of one built-in process role.
 *
 * @public
 */
export interface ISkillRoleInstructionsEditorRequest extends ISettingsEditorRequest {
  /**
   * The editor kind.
   *
   * @public
   * @readonly
   */
  readonly kind: 'skill-role-instructions';
  /**
   * The process role whose instructions the sheet edits.
   *
   * @public
   * @readonly
   */
  readonly role: BuiltinSkillDto['role'];
}
