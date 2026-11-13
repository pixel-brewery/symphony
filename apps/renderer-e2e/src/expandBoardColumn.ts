// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/**
 * Expands one board column through Mosaik's own disclosure control.
 *
 * @param page - Main window.
 * @param columnId - Board column id, for example `backlog`.
 * @public
 */
export async function expandBoardColumn(page: Page, columnId: string): Promise<void> {
  const column = page.getByTestId(`board-column-${columnId}`);
  await expect(column).toBeVisible();
  const toggle = column.locator('[part="toggle"]');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await expect(column).toHaveJSProperty('isExpanded', true);
}
