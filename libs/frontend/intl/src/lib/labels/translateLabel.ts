// #region Imports

import english from './lang.en.json';
import { LabelLocalizationBinding } from './LabelLocalizationBinding';

// #endregion

/**
 * Translates a known presentation label through the application owner, tracking its language signal.
 * Known English copy also supports pure projections in tests without an Angular application.
 *
 * @param key - A key in the application label catalog.
 * @param parameters - Values for positional placeholders.
 * @returns The localized label, or its English form outside an initialized application.
 * @public
 */
export function translateLabel(key: keyof typeof english, ...parameters: Array<unknown>): string {
  if (!Object.hasOwn(english, key)) throw new Error(`Unknown application label key: ${key}`);
  const localization = LabelLocalizationBinding.current;
  if (localization) return localization.translate(key, ...parameters);
  const source = english[key];
  return source.replace(/\{(\d+)\}/gu, (placeholder, index: string) => {
    const parameter = parameters[Number(index)];
    return parameter !== undefined ? String(parameter) : placeholder;
  });
}
