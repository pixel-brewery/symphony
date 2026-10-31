// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('shows where a work item stands in the process from its board context menu', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `process-drawer-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: workspace,
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();

    // The item rests in Backlog, which the board starts collapsed.
    const workItemId = 'work-item-142';
    await expandBoardColumn(page, 'backlog');
    const card = page.getByTestId(`board-item-${workItemId}`);
    await expect(card).toBeVisible();

    await card.click({ button: 'right' });
    const processAction = page.getByTestId(`board-item-action-process-${workItemId}`);
    await expect(processAction).toBeVisible();
    await expect(processAction).toContainText('Show process');
    await processAction.click();

    await expect(page.getByTestId('process-drawer')).toBeVisible();
    await expect(page.getByTestId('process-graph')).toBeVisible();

    // Every configured stage becomes a node, and the transitions between them become edges.
    const configured = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      return {
        stageIds: settings.workflow.stages.map((stage) => stage.id),
        transitionIds: settings.workflow.transitions.map((transition) => transition.id),
      };
    });
    for (const stageId of configured.stageIds) {
      await expect(page.getByTestId(`process-stage-${stageId}`)).toBeVisible();
    }
    await expect(page.locator('[test-id^="process-edge-"]')).toHaveCount(
      configured.transitionIds.length,
    );

    // The stage the item rests in is the one the view marks, and it marks only that one.
    const currentStageId = await page.evaluate(async (id) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      return snapshot.workItems.find((item) => item.id === id)?.stageId;
    }, workItemId);
    expect(configured.stageIds).toContain(currentStageId);
    await expect(page.locator('[test-id^="process-stage-"][data-state="current"]')).toHaveCount(1);
    await expect(page.getByTestId(`process-stage-${currentStageId}`)).toHaveAttribute(
      'data-state',
      'current',
    );

    // No run has touched the item, so the view says so rather than showing an empty history.
    await expect(page.getByTestId('process-no-record')).toBeVisible();
    await expect(page.getByTestId('process-audit-empty')).toBeVisible();

    // Selecting a stage narrows the panel to that stage.
    const currentStage = page.getByTestId(`process-stage-${currentStageId}`);
    await currentStage.getByRole('button').focus();
    await currentStage.getByRole('button').press('Enter');
    await expect(page.getByTestId('process-stage-detail')).toBeVisible();
    await page.screenshot({
      path: resolve(outputDirectory, 'process-drawer.png'),
      fullPage: true,
    });
    await page.getByTestId('process-clear-selection').click();
    await expect(page.getByTestId('process-stage-detail')).toHaveCount(0);

    // Return routes retain keyboard access to the existing transition details.
    const transitionId = configured.transitionIds[0]!;
    const transition = page.getByTestId(`process-edge-${transitionId}`);
    await transition.getByRole('button').focus();
    await transition.getByRole('button').press('Enter');
    await expect(page.getByTestId('process-transition-detail')).toBeVisible();
    await page.getByTestId('process-clear-selection').click();

    // The view is read-only: dragging a stage pans the canvas but never moves the stage.
    // Comparing the offset between two stages separates the two, because a pan moves both.
    const stage = currentStage;
    const neighbour = page.getByTestId(
      `process-stage-${configured.stageIds.find((id) => id !== currentStageId)}`,
    );
    const offsetBetweenStages = async () => {
      const [one, other] = await Promise.all([stage.boundingBox(), neighbour.boundingBox()]);
      // Rounded: layout arithmetic differs in the last floating-point digit between reads.
      return {
        x: Math.round((one?.x ?? 0) - (other?.x ?? 0)),
        y: Math.round((one?.y ?? 0) - (other?.y ?? 0)),
      };
    };
    const offsetBefore = await offsetBetweenStages();
    const grip = await stage.boundingBox();
    await stage.hover();
    await page.mouse.down();
    await page.mouse.move((grip?.x ?? 0) + 160, (grip?.y ?? 0) + 120, { steps: 8 });
    await page.mouse.up();
    expect(await offsetBetweenStages()).toEqual(offsetBefore);

    expect(rendererErrors).toEqual([]);
    await page.getByTestId('process-drawer-close').click();
    await expect(page.getByTestId('process-drawer')).toHaveCount(0);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
