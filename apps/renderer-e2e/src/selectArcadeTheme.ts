// #region Imports

import { expect, type ElectronApplication, type Page } from '@playwright/test';
import { closeSettingsWindow } from './closeSettingsWindow';
import { openSettingsWindow } from './openSettingsWindow';

// #endregion

/**
 * Changes the colour theme through Settings › Appearance, which applies at once, waits until the
 * main window follows it and closes Settings again before an Arcade route opens.
 *
 * @param app - The launched application.
 * @param page - The main window.
 * @param theme - The theme to choose.
 * @public
 */
export async function selectArcadeTheme(
  app: ElectronApplication,
  page: Page,
  theme: 'light' | 'dark',
): Promise<void> {
  const settings = await openSettingsWindow(app, page);
  await settings.getByTestId('global-settings-section-appearance').click();
  await settings.getByTestId(`theme-${theme}`).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('theme-mode')))
    .toBe(theme);
  await closeSettingsWindow(app);
}
