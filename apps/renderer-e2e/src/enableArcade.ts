// #region Imports

import { expect, type Page } from '@playwright/test';
import { closeSettings } from './closeSettings';
import { openSettings } from './openSettings';

// #endregion

/**
 * Enables the optional Arcade destination through Settings › Appearance › `Show Arcade`, which
 * applies at once, closes Settings again and waits until the main window's navigation shows
 * Arcade, so later input belongs to the main window's destinations.
 *
 * @param page - The main window.
 * @public
 */
export async function enableArcade(page: Page): Promise<void> {
  await openSettings(page);
  await page.getByTestId('global-settings-section-appearance').click();
  const toggle = page.getByTestId('arcade-enabled-toggle');
  await expect(toggle).toBeVisible();
  if (
    (await toggle.evaluate((element) =>
      Boolean((element as { isChecked?: boolean }).isChecked),
    )) === false
  )
    await toggle.click();
  await expect(toggle).toHaveJSProperty('isChecked', true);
  await dismissNotifications(page);
  await closeSettings(page);
  await expect(page.getByTestId('navigation-arcade')).toBeVisible();
}

/** Closes the success notices the change raised. */
async function dismissNotifications(page: Page): Promise<void> {
  const notifications = page.getByTestId('notification-success');
  await expect(notifications.first()).toBeVisible();
  while ((await notifications.count()) > 0) {
    const count = await notifications.count();
    await page.keyboard.press('Escape');
    await expect.poll(() => notifications.count()).toBeLessThan(count);
  }
}
