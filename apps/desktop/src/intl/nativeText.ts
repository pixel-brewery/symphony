// #region Imports

import english from './resources/lang.en.json';
import german from './resources/lang.de.json';

// #endregion

/**
 * Resolves app-authored native menu and dialog copy in the operating system's language.
 * Renderer and mobile language preferences remain owned by their browser profiles.
 *
 * @param locale - Electron's operating-system locale, read after application readiness.
 * @param key - An authored native catalog key.
 * @param parameters - Values for positional placeholders.
 * @returns German for a German system locale, otherwise English.
 * @public
 */
export function nativeText(
  locale: string,
  key: keyof typeof english,
  ...parameters: Array<unknown>
): string {
  const catalog = /^de(?:[-_]|$)/iu.test(locale) ? german : english;
  const source = catalog[key];
  return source.replace(/\{(\d+)\}/gu, (placeholder, index: string) => {
    const parameter = parameters[Number(index)];
    return parameter !== undefined ? String(parameter) : placeholder;
  });
}
