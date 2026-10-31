// #region Imports

import { expect, type Page } from '@playwright/test';
import { closeSettings } from './closeSettings';
import { openSettings } from './openSettings';

// #endregion

/**
 * Changes the colour theme through Settings › Appearance, which applies at once, waits until the
 * main window follows it and closes Settings again before an Arcade route opens.
 *
 * @param page - The main window.
 * @param theme - The theme to choose.
 * @public
 */
export async function selectArcadeTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await openSettings(page);
  await page.getByTestId('global-settings-section-appearance').click();
  await page.getByTestId(`theme-${theme}`).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('theme-mode')))
    .toBe(theme);
  await closeSettings(page);
}
