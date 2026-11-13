// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

const outputDirectory = resolve('output/playwright');
const configurationRoot = resolve(outputDirectory, `board-column-collapse-${process.pid}`);

function launch(): Promise<ElectronApplication> {
  return electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });
}

test('collapses Backlog, Qualified and Done by default and keeps every toggle across a restart', async () => {
  // arrange
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });

  // act
  const first = await launch();
  // assert
  try {
    const page = await first.firstWindow();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);

    for (const columnId of ['backlog', 'qualified', 'done']) {
      const strip = page.getByTestId(`board-column-${columnId}`);
      await expect(strip).toHaveJSProperty('isExpanded', false);
      await expect(strip.locator('[part="toggle"]')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByTestId(`board-column-count-${columnId}`)).toBeVisible();
    }
    const ready = page.getByTestId('board-column-ready');
    await expect(ready).toHaveJSProperty('isExpanded', true);

    await expandBoardColumn(page, 'backlog');
    await expect(page.getByTestId('board-item-work-item-142')).toBeVisible();
    await ready.locator('[part="toggle"]').click();
    await expect(ready).toHaveJSProperty('isExpanded', false);
    await page.screenshot({ path: resolve(outputDirectory, 'board-column-collapse.png') });
  } finally {
    await first.close();
  }

  const second = await launch();
  try {
    const page = await second.firstWindow();
    // The restarted window reopens the Board, the screen it showed last.
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);

    // Both explicit choices survive the restart, alongside the untouched defaults.
    await expect(page.getByTestId('board-column-backlog')).toHaveJSProperty('isExpanded', true);
    await expect(page.getByTestId('board-column-ready')).toHaveJSProperty('isExpanded', false);
    await expect(page.getByTestId('board-column-qualified')).toHaveJSProperty('isExpanded', false);
    await expect(page.getByTestId('board-column-done')).toHaveJSProperty('isExpanded', false);
    await expect(page.getByTestId('board-column-acceptance')).toHaveJSProperty('isExpanded', true);
  } finally {
    await second.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
