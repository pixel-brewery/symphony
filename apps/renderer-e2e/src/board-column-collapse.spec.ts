// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';

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

    // The columns before analysed work and the finished work start as narrow strips with their
    // count and name; the columns of active delivery start expanded.
    for (const columnId of ['backlog', 'qualified', 'done']) {
      const strip = page.getByTestId(`board-column-${columnId}`);
      await expect(strip).toHaveAttribute('aria-expanded', 'false');
      await expect(strip.locator('symphony-board-column-entry')).toHaveCount(0);
      const count = page.getByTestId(`board-column-count-${columnId}`);
      await expect
        .poll(() => count.evaluate((element) => (element as { text?: string }).text ?? ''))
        .toMatch(/^\d+$/u);
    }
    const ready = page.locator('mosaik-flow-board-column[column-key="ready"]');
    await expect(ready).toHaveJSProperty('isExpanded', true);

    // A strip expands its column; an expanded column collapses through the plain chevron beside
    // its `+`.
    await page.getByTestId('board-column-backlog').click();
    const backlog = page.locator('mosaik-flow-board-column[column-key="backlog"]');
    await expect(backlog).toHaveJSProperty('isExpanded', true);
    await expect(page.getByTestId('board-column-viewport-backlog')).toBeVisible();

    await page.getByTestId('board-column-collapse-ready').click();
    await expect(page.getByTestId('board-column-ready')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('mosaik-flow-board-column[column-key="ready"]')).toHaveCount(0);
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

    // Both explicit choices survive the restart; the untouched defaults stay as they were.
    await expect(page.locator('mosaik-flow-board-column[column-key="backlog"]')).toHaveJSProperty(
      'isExpanded',
      true,
    );
    await expect(page.getByTestId('board-column-ready')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('board-column-qualified')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.getByTestId('board-column-done')).toHaveAttribute('aria-expanded', 'false');
    await expect(
      page.locator('mosaik-flow-board-column[column-key="acceptance"]'),
    ).toHaveJSProperty('isExpanded', true);
  } finally {
    await second.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
