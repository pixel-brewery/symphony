// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('opens a work item as its own screen with stages, inspector, activity and history navigation', async () => {
  // arrange
  const configurationRoot = resolve(
    'output/playwright',
    `ticket-detail-dialog-configuration-${process.pid}`,
  );
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
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
    },
  });

  // act
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expandBoardColumn(page, 'backlog');
    await page.getByTestId('board-item-work-item-142').click();

    // assert
    await expect(page).toHaveURL(/\/main\/board\/work-item-142$/u);
    await expect(page.getByTestId('work-item-view')).toBeVisible();
    await expect(page.getByTestId('task-loading-skeleton')).toHaveCount(0);
    // The toolbar names the item; its subtitle names the board column it rests in.
    await expect(page.getByTestId('window-title-text')).toContainText('#142');
    await expect(page.getByTestId('window-subtitle')).toContainText('Board · Backlog');
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Add deterministic workspace reconciliation',
    );
    await expect(page.getByTestId('task-drawer-description')).toBeVisible();
    await expect(page.getByTestId('work-item-stages')).toBeVisible();
    await expect(page.getByTestId('work-item-stage-analysis')).toHaveAttribute(
      'data-state',
      'current',
    );
    await expect(page.getByTestId('task-metadata')).toBeVisible();
    await expect(page.getByTestId('work-item-column')).toContainText('Backlog');
    await expect(page.getByTestId('task-activity-opened')).toBeVisible();
    const comments = page
      .getByTestId('task-drawer-events')
      .locator('[data-activity-kind="comment"]');
    await expect(comments).toHaveCount(3);
    await expect(page.getByTestId('task-drawer-comment-draft')).toBeVisible();

    await page.getByTestId('task-drawer-title').hover();
    await page.screenshot({
      path: resolve('output/playwright', 'ticket-detail-dialog.png'),
      fullPage: true,
    });

    await page
      .getByTestId('task-drawer-comment-draft')
      .locator('textarea')
      .fill('Keep the detail discussion with the ticket.');
    await page.getByTestId('task-drawer-comment-submit').click();
    await expect(comments).toHaveCount(4);
    await expect(page.getByTestId('task-drawer-events')).toContainText(
      'Keep the detail discussion with the ticket.',
    );

    await expect(page.getByTestId('task-ai-delegation')).toBeVisible();
    await expect(page.getByTestId('task-step-by-step-controls')).toBeVisible();

    // `Edit` in the toolbar turns title, description and fields into inputs; `Preview` shows the
    // unsaved values while `Save changes` and `Cancel editing` stay offered.
    const edit = page.getByTestId('task-drawer-edit-content');
    await expect(edit).toHaveAttribute('aria-label', 'Edit work item');
    await edit.click();
    await expect(page.getByTestId('issue-title')).toBeVisible();
    await expect(page.getByTestId('task-details-section')).toBeVisible();
    await expect(page.getByTestId('issue-save')).toBeVisible();
    await page.getByTestId('issue-title').locator('input').fill('Preview this unsaved ticket');
    await expect(edit).toHaveAttribute('aria-label', 'Preview');
    await edit.click();
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Preview this unsaved ticket',
    );
    await expect(page.getByTestId('issue-save')).toBeVisible();
    await page.getByTestId('task-edit-cancel').click();
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Add deterministic workspace reconciliation',
    );
    await expect(page.getByTestId('issue-save')).toHaveCount(0);

    // Back and forward follow the router history between the board and the screen.
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('work-item-view')).toHaveCount(0);
    await page.getByTestId('navigate-forward').click();
    await expect(page.getByTestId('work-item-view')).toBeVisible();
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Add deterministic workspace reconciliation',
    );

    // An id the board does not know says so and leads back to the board.
    await page.evaluate(() => {
      window.location.hash = '#/main/board/does-not-exist';
    });
    await expect(page.getByTestId('work-item-not-found')).toBeVisible();
    await page.getByTestId('work-item-back-to-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
