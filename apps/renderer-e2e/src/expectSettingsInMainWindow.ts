// #region Imports

import { expect, type ElectronApplication, type Page } from '@playwright/test';

// #endregion

/**
 * Asserts that Settings is shown inside the main window: the main window is on its Settings
 * route, the Settings navigation replaces the sidebar's destinations, and no window besides the
 * main window and the macOS menu-bar panel exists.
 *
 * @param app - The launched application.
 * @param page - The main window.
 * @public
 */
export async function expectSettingsInMainWindow(
  app: ElectronApplication,
  page: Page,
): Promise<void> {
  await expect(page).toHaveURL(/#\/main\/settings(\?|$)/u);
  await expect(page.getByTestId('settings-view')).toBeVisible();
  await expect(
    page.getByTestId('window-sidebar-override').getByTestId('settings-sidebar'),
  ).toBeVisible();
  await expect(page.getByTestId('presenter-navigation')).toHaveCount(0);
  expect(
    app
      .windows()
      .map((window) => window.url())
      .filter((url) => !url.includes('#/menu-bar')),
  ).toEqual([page.url()]);
}
