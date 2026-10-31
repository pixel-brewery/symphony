// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('moves a virtualized board entry between CDK column drop targets', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `board-virtualized-drag-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: workspace,
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

  // act
  try {
    const page = await app.firstWindow();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);
    // Qualified starts as a collapsed strip; the card is dragged out of the expanded column.
    await expandBoardColumn(page, 'qualified');
    const workItemId = 'work-item-138';
    const card = page.getByTestId(`board-item-${workItemId}`);
    await expect(
      page.getByTestId('board-column-qualified').getByTestId(`board-item-${workItemId}`),
    ).toBeVisible();
    const dragEntry = card.locator('xpath=ancestor::symphony-board-column-entry');
    const targetColumn = page.getByTestId('board-column-ready');
    const sourceBox = await dragEntry.boundingBox();
    const targetBox = await targetColumn.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + 24);
    await page.mouse.down();
    await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 120, {
      steps: 20,
    });
    await page.mouse.up();

    // assert
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          const snapshot = await api.request('snapshot.get', {});
          return snapshot.workItems.find((item) => item.id === id)?.boardColumnId;
        }, workItemId),
      )
      .toBe('ready');
    await expect(
      page.getByTestId('board-column-ready').getByTestId(`board-item-${workItemId}`),
    ).toBeVisible();
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
