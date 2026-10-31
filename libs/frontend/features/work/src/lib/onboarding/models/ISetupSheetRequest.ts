// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/**
 * Opens the `Build your project team` sheet of the Settings window.
 *
 * @public
 */
export interface ISetupSheetRequest extends ISettingsEditorRequest {
  /**
   * The sheet's request kind.
   *
   * @public
   * @readonly
   */
  readonly kind: 'setup';
}
