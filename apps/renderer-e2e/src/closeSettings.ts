// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/**
 * Leaves Settings through the toolbar's back navigation, so the sidebar shows the main window's
 * destinations again and later input and screenshots belong to the previous screen.
 *
 * @param page - The main window.
 * @public
 */
export async function closeSettings(page: Page): Promise<void> {
  const settings = page.getByTestId('settings-view');
  for (let step = 0; step < 20 && (await settings.isVisible()); step++) {
    await page.getByTestId('navigate-back').click();
  }
  await expect(settings).toHaveCount(0);
  await expect(page.getByTestId('window-sidebar-override')).toHaveCount(0);
}
