// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/** Changes the scheme through the real settings UI before opening an Arcade route. @public */
export async function selectArcadeTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.getByTestId('global-workspace-filter').click();
  await page.getByTestId('workspace-menu-settings').click();
  await expect(page.getByTestId('settings-view')).toBeVisible();
  await page.getByTestId('global-settings-section-appearance').click();
  await page.getByTestId('theme-select').click();
  await page.getByTestId(`theme-${theme}`).click();
  await page.getByTestId('save-theme').click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('theme-mode')))
    .toBe(theme);
  const notifications = page.getByTestId('notification-success');
  await expect(notifications.first()).toBeVisible();
  while ((await notifications.count()) > 0) {
    const count = await notifications.count();
    await page.keyboard.press('Escape');
    await expect.poll(() => notifications.count()).toBeLessThan(count);
  }
}
