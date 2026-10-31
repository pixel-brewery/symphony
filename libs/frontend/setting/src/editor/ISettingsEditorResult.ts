// #region Imports

import type { ISettingsEditorRequest } from './ISettingsEditorRequest';

// #endregion

/**
 * Describes an optional follow-up editor requested when a feature-owned sheet closes.
 *
 * @public
 */
export interface ISettingsEditorResult {
  /**
   * Next typed request to dispatch through the same generic editor coordinator.
   *
   * @public
   * @readonly
   */
  readonly next?: ISettingsEditorRequest;
}
