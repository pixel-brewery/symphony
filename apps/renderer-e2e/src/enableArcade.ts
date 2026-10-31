// #region Imports

import { expect, type ElectronApplication, type Page } from '@playwright/test';
import { closeSettingsWindow } from './closeSettingsWindow';
import { openSettingsWindow } from './openSettingsWindow';

// #endregion

/**
 * Enables the optional Arcade destination through Settings › Appearance › `Show Arcade`, which
 * applies at once, waits until the main window shows Arcade in its navigation and closes Settings
 * again, so later input belongs to the main window.
 *
 * @param app - The launched application.
 * @param page - The main window.
 * @public
 */
export async function enableArcade(app: ElectronApplication, page: Page): Promise<void> {
  const settings = await openSettingsWindow(app, page);
  await settings.getByTestId('global-settings-section-appearance').click();
  const toggle = settings.getByTestId('arcade-enabled-toggle');
  await expect(toggle).toBeVisible();
  if (
    (await toggle.evaluate((element) =>
      Boolean((element as { isChecked?: boolean }).isChecked),
    )) === false
  )
    await toggle.click();
  await expect(toggle).toHaveJSProperty('isChecked', true);
  await expect(page.getByTestId('navigation-arcade')).toBeVisible();
  await dismissNotifications(settings);
  await closeSettingsWindow(app);
}

/** Closes the success notices the change raised in the Settings window. */
async function dismissNotifications(settings: Page): Promise<void> {
  const notifications = settings.getByTestId('notification-success');
  await expect(notifications.first()).toBeVisible();
  while ((await notifications.count()) > 0) {
    const count = await notifications.count();
    await settings.keyboard.press('Escape');
    await expect.poll(() => notifications.count()).toBeLessThan(count);
  }
}
