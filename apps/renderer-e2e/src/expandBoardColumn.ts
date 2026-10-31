// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/**
 * Expands one board column. The board collapses `Backlog`, `Qualified` and `Done` into narrow
 * strips by default; a strip is a button that expands its column into a full Mosaik column.
 *
 * @param page - Main window.
 * @param columnId - Board column id, for example `backlog`.
 * @public
 */
export async function expandBoardColumn(page: Page, columnId: string): Promise<void> {
  const column = page.getByTestId(`board-column-${columnId}`);
  await expect(column).toBeVisible();
  if ((await column.getAttribute('aria-expanded')) === 'false') await column.click();
  await expect(page.locator(`mosaik-flow-board-column[column-key="${columnId}"]`)).toBeVisible();
}
