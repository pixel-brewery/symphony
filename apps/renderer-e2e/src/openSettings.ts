// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/**
 * Opens Settings from the main window's sidebar.
 *
 * Settings opens inside the main window: its navigation replaces the sidebar's destinations and
 * the toolbar's back navigation leads out of it again. A second call keeps the open Settings.
 *
 * @param page - The main window.
 * @returns The main window, showing Settings.
 * @public
 */
export async function openSettings(page: Page): Promise<Page> {
  if (!(await page.getByTestId('settings-view').isVisible())) {
    await page.getByTestId('navigation-settings').click();
  }
  await expect(page.getByTestId('settings-view')).toBeVisible();
  await expect(
    page.getByTestId('window-sidebar-override').getByTestId('settings-sidebar'),
  ).toBeVisible();
  return page;
}
