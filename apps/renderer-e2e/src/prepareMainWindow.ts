// #region Imports

import { expect, type ElectronApplication, type Page } from '@playwright/test';
import type { BrowserWindow } from 'electron';

// #endregion

const RUNNER_TEST_WINDOW = { width: 1040, height: 700 } as const;

/**
 * Returns the primary renderer at the smallest supported window on local and hosted macOS displays.
 *
 * @public
 */
export async function prepareMainWindow(app: ElectronApplication): Promise<Page> {
  const page = await app.firstWindow();
  const mainWindow = await app.browserWindow(page);

  await mainWindow.evaluate((window: BrowserWindow, viewport) => {
    window.webContents.setZoomFactor(1);
    window.setContentSize(viewport.width, viewport.height);
  }, RUNNER_TEST_WINDOW);
  await page.waitForFunction(
    ({ width, height }) => window.innerWidth === width && window.innerHeight === height,
    RUNNER_TEST_WINDOW,
  );
  await page.getByTestId('orbit-view').waitFor({ state: 'visible' });
  if (process.env['SYMPHONY_E2E_WINDOW_MODE'] === 'hidden') {
    const isNativeWindowVisible = await mainWindow.evaluate((window: BrowserWindow) =>
      window.isVisible(),
    );
    if (isNativeWindowVisible) {
      throw new Error('The main Electron window became visible during a hidden E2E run.');
    }
  } else {
    await expect
      .poll(() => mainWindow.evaluate((window: BrowserWindow) => window.isVisible()))
      .toBe(true);
  }
  return page;
}
