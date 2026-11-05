// #region Imports

import { LabelLocalizationBinding } from './LabelLocalizationBinding';

// #endregion

/**
 * Resolves date, number and list formatting from the canonical application language signal.
 *
 * @returns The active formatting locale, or English for pure consumers outside the application.
 * @public
 */
export function labelLocale(): 'en-US' | 'de-DE' {
  return LabelLocalizationBinding.current?.language?.() === 'de' ? 'de-DE' : 'en-US';
}
