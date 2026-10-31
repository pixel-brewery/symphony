// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';

// #endregion

/**
 * Reports whether a saved setting can change background work. Selecting another visible
 * workspace is presentation state and must not start automation for every provider again.
 *
 * @param current - Settings before the save.
 * @param next - Persisted settings after the save.
 * @public
 */
export function needsSettingsBackgroundSynchronization(
  current: IApplicationSettings,
  next: IApplicationSettings,
): boolean {
  const currentBackgroundSettings: Partial<IApplicationSettings> = { ...current };
  const nextBackgroundSettings: Partial<IApplicationSettings> = { ...next };
  Reflect.deleteProperty(currentBackgroundSettings, 'activeViewScope');
  Reflect.deleteProperty(nextBackgroundSettings, 'activeViewScope');
  return JSON.stringify(currentBackgroundSettings) !== JSON.stringify(nextBackgroundSettings);
}
