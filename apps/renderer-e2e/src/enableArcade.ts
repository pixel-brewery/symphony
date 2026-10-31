// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/** Enables the optional Arcade destination through the persisted Appearance setting. @public */
export async function enableArcade(page: Page): Promise<void> {
  await page.getByTestId('global-workspace-filter').click();
  await page.getByTestId('workspace-menu-settings').click();
  await expect(page.getByTestId('settings-view')).toBeVisible();
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
  await expect(page.getByTestId('navigation-arcade')).toBeVisible();
  const notifications = page.getByTestId('notification-success');
  await expect(notifications.first()).toBeVisible();
  while ((await notifications.count()) > 0) {
    const count = await notifications.count();
    await page.keyboard.press('Escape');
    await expect.poll(() => notifications.count()).toBeLessThan(count);
  }
}
