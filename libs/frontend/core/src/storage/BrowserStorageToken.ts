// #region Imports
import { InjectionToken } from '@angular/core';
import { browserStorage } from './browserStorage';
// #endregion

/**
 * Provides browser storage without coupling state stores to browser globals.
 *
 * @public
 */
export const BROWSER_STORAGE = new InjectionToken<Storage | undefined>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: browserStorage,
});
