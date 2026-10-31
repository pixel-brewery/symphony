// #region Imports

import { expect, type ElectronApplication, type Page } from '@playwright/test';

// #endregion

const SETTINGS_WINDOW_SIZE = { width: 1000, height: 760 } as const;

/**
 * Opens Settings from the main window's sidebar and returns the separate Settings window.
 *
 * Settings is its own Electron window on every platform. A second call focuses the same window,
 * so the returned page is the one already open.
 *
 * @param app - The launched application.
 * @param page - The main window.
 * @returns The Settings window, sized to its default 1000 × 760 and showing its sidebar.
 * @public
 */
export async function openSettingsWindow(app: ElectronApplication, page: Page): Promise<Page> {
  const isSettings = (candidate: Page): boolean => candidate.url().includes('#/settings');
  const existing = app.windows().find(isSettings);
  const opened = existing
    ? Promise.resolve(existing)
    : app.waitForEvent('window', { timeout: 30_000 });
  await page.getByTestId('navigation-settings').click();
  const settings = await opened;
  await expect.poll(() => isSettings(settings), { timeout: 15_000 }).toBe(true);
  const window = await app.browserWindow(settings);
  await window.evaluate((browserWindow, size) => {
    browserWindow.webContents.setZoomFactor(1);
    browserWindow.setContentSize(size.width, size.height);
  }, SETTINGS_WINDOW_SIZE);
  await expect(settings.getByTestId('settings-window')).toBeVisible();
  return settings;
}
