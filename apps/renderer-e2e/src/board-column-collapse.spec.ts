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

test('keeps a collapsed board column collapsed across a restart', async () => {
  // arrange
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });

  let collapsedColumnKey = '';
  // act
  const first = await launch();
  // assert
  try {
    const page = await first.firstWindow();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);

    const column = page.locator('mosaik-flow-board-column').first();
    await expect(column).toBeVisible();
    collapsedColumnKey = await column.evaluate(
      (element) => (element as HTMLElement & { columnKey?: string }).columnKey ?? '',
    );
    expect(collapsedColumnKey).not.toBe('');

    // The collapse control lives in the column's shadow root; Mosaik exposes it as `part="toggle"`.
    await column.locator('[part~="toggle"]').click();
    await expect
      .poll(() =>
        column.evaluate(
          (element) => (element as HTMLElement & { isExpanded?: boolean }).isExpanded,
        ),
      )
      .toBe(false);
    await expect(column.locator('cdk-virtual-scroll-viewport')).toHaveCount(0);
    await expect(column.locator('symphony-board-column-entry')).toHaveCount(0);
  } finally {
    await first.close();
  }

  const second = await launch();
  try {
    const page = await second.firstWindow();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);

    const columns = page.locator('mosaik-flow-board-column');
    await expect(columns.first()).toBeVisible();
    await expect
      .poll(() =>
        columns.evaluateAll(
          (elements, columnKey) =>
            elements
              .filter(
                (element) =>
                  (element as HTMLElement & { columnKey?: string }).columnKey === columnKey,
              )
              .map((element) => (element as HTMLElement & { isExpanded?: boolean }).isExpanded),
          collapsedColumnKey,
        ),
      )
      .toEqual([false]);
    const collapsedColumn = page.locator(
      `mosaik-flow-board-column[column-key="${collapsedColumnKey}"]`,
    );
    await expect(collapsedColumn.locator('cdk-virtual-scroll-viewport')).toHaveCount(0);
    // Only the collapsed column is restored; every other column stays open.
    expect(
      await columns.evaluateAll(
        (elements, columnKey) =>
          elements
            .filter(
              (element) =>
                (element as HTMLElement & { columnKey?: string }).columnKey !== columnKey,
            )
            .every((element) => (element as HTMLElement & { isExpanded?: boolean }).isExpanded),
        collapsedColumnKey,
      ),
    ).toBe(true);
  } finally {
    await second.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
