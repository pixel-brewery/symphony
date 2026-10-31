// #region Imports

import { expect, type ElectronApplication } from '@playwright/test';

// #endregion

/**
 * Closes the separate Settings window when it is open, so later keyboard input and screenshots
 * belong to the main window again.
 *
 * @param app - The launched application.
 * @public
 */
export async function closeSettingsWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()
      .find((window) => window.webContents.getURL().includes('#/settings'))
      ?.close();
  });
  await expect
    .poll(() => app.windows().filter((window) => window.url().includes('#/settings')).length)
    .toBe(0);
}
