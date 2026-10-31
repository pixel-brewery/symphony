// #region Imports

import type { DesktopNavigationPath } from './DesktopNavigationPath';

// #endregion

const FIXED_PATHS: readonly string[] = [
  '/main/home',
  '/main/inbox',
  '/main/actions',
  '/main/board?create=true',
  '/main/home?notifications=open',
];
const SETTINGS_PARAMETER = '[a-z][a-zA-Z-]{0,31}=[A-Za-z0-9._~-]{1,200}';
const SETTINGS_PATH = new RegExp(
  `^/main/settings(?:\\?${SETTINGS_PARAMETER}(?:&${SETTINGS_PARAMETER}){0,7})?$`,
  'u',
);

/**
 * Narrows an untrusted IPC payload to a destination the main window may open: one of the fixed
 * destinations, or `/main/settings` with at most eight bounded `key=value` location parameters.
 *
 * @param value - Raw payload received over the navigation channel.
 * @returns Whether the value is a known in-app destination.
 * @public
 */
export function isDesktopNavigationPath(value: unknown): value is DesktopNavigationPath {
  return typeof value === 'string' && (FIXED_PATHS.includes(value) || SETTINGS_PATH.test(value));
}
