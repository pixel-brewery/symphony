// #region Imports

import { InjectionToken } from '@angular/core';
import type { IApplicationLanguageStorage } from './IApplicationLanguageStorage';

// #endregion

/**
 * The optional host-owned profile port; unavailable storage keeps a session-only preference.
 *
 * @public
 */
export const APPLICATION_LANGUAGE_STORAGE = new InjectionToken<
  IApplicationLanguageStorage | undefined
>('APPLICATION_LANGUAGE_STORAGE', {
  providedIn: 'root',
  factory: () => undefined,
});
