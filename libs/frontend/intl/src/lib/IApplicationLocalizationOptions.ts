// #region Imports

import type { IApplicationLanguageStorage } from './IApplicationLanguageStorage';

// #endregion

/**
 * Supplies the browser-profile port without coupling localization to application state owners.
 *
 * @public
 */
export interface IApplicationLocalizationOptions {
  readonly storage?: IApplicationLanguageStorage;
}
