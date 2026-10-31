// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('restores work items and explains a provider request limit after restart', async () => {
  // arrange
  const configurationRoot = resolve(
    'output/playwright',
    `remote-projection-configuration-${process.pid}`,
  );
  const userDataDirectory = resolve(configurationRoot, 'electron');
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
  const environment = {
    ...process.env,
    SYMPHONY_CONFIG_ROOT: configurationRoot,
    SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
    SYMPHONY_TRACKER_MODE: 'simulated',
    SYMPHONY_CONNECTION_MODE: 'simulated',
    SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
    SYMPHONY_WORKSPACE_MODE: 'simulated',
  };
  // assert
  try {
    const onlineApp = await electron.launch({
      args: ['.', `--user-data-dir=${userDataDirectory}`],
      cwd: resolve('.'),
      env: environment,
    });
    try {
      const page = await onlineApp.firstWindow();
      await expect(page.getByTestId('home-view')).toBeVisible();
      await page.getByTestId('navigation-home').click();
      await expect(page.getByTestId('home-view')).toBeVisible();
      await page.getByTestId('navigation-board').click();
      const currentBoardItem = page.getByTestId('board-item-work-item-142');
      await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);
      // The item rests in Backlog, which the board starts collapsed.
      await expandBoardColumn(page, 'backlog');
      await expect(currentBoardItem).toBeVisible();
      await expect(currentBoardItem).toContainText('Add deterministic workspace reconciliation');
      await expect(page.getByTestId('work-items-stale-data')).toHaveCount(0);
    } finally {
      await onlineApp.close();
    }

    const offlineApp = await electron.launch({
      args: ['.', `--user-data-dir=${userDataDirectory}`],
      cwd: resolve('.'),
      env: { ...environment, SYMPHONY_SIMULATED_TRACKER_FAILURE: 'rate-limit' },
    });
    try {
      const page = await offlineApp.firstWindow();
      // The restarted window reopens the Board, the screen it showed last.
      await expect(page.getByTestId('board-view')).toBeVisible();
      await page.getByTestId('navigation-home').click();
      await expect(page.getByTestId('home-view')).toBeVisible();
      await page.getByTestId('navigation-board').click();

      const restoredBoardItem = page.getByTestId('board-item-work-item-142');
      await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);
      await expandBoardColumn(page, 'backlog');
      await expect(restoredBoardItem).toBeVisible();
      await expect(restoredBoardItem).toContainText('Add deterministic workspace reconciliation');
      const staleBanner = page.getByTestId('work-items-stale-data');
      await expect(staleBanner).toContainText('Provider request limit reached');
      await expect(staleBanner).toContainText('Work items were last updated');
      await page.getByTestId('retry-work-items-refresh').click();
      await expect(staleBanner).toBeVisible();
      await expect(page.getByTestId('notification-error')).toHaveCount(0);
    } finally {
      await offlineApp.close();
    }
  } finally {
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
