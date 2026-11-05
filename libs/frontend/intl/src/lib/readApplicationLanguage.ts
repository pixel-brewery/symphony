// #region Imports

import type { ApplicationLanguage } from './ApplicationLanguage';
import type { IApplicationLanguageStorage } from './IApplicationLanguageStorage';
import { applicationLanguageStorageKey } from './ApplicationLanguageStorageKey';

// #endregion

/**
 * Restores a supported preference; unavailable storage and unsupported values use English.
 *
 * @param storage - The current browser profile, when available.
 * @returns A supported application language.
 * @public
 */
export function readApplicationLanguage(
  storage?: Pick<IApplicationLanguageStorage, 'getItem'>,
): ApplicationLanguage {
  try {
    return storage?.getItem(applicationLanguageStorageKey) === 'de' ? 'de' : 'en';
  } catch {
    return 'en';
  }
}
