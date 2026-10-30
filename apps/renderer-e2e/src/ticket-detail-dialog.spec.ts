// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

// #endregion

test('presents ticket detail as collapsible checks and activity with a fixed discussion footer', async () => {
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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await page.getByTestId('board-item-work-item-142').click();

    // assert
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(page.getByTestId('task-loading-skeleton')).toHaveCount(0);
    const drawerHeader = page.locator('mosaik-drawer-header').last();
    const headerClose = page.getByTestId('task-drawer-header-close');
    await expect(headerClose).toHaveJSProperty('tagName', 'MOSAIK-BUTTON');
    expect(
      await drawerHeader.evaluate((element) =>
        window.getComputedStyle(element).getPropertyValue('-webkit-app-region'),
      ),
    ).toBe('no-drag');
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Add deterministic workspace reconciliation',
    );
    await expect(page.getByTestId('task-metadata')).toBeVisible();
    await expect(page.getByTestId('task-description-section')).toHaveJSProperty(
      'isExpanded',
      false,
    );
    await expect(page.getByTestId('task-checks-section')).toHaveJSProperty('isExpanded', false);
    await expect(page.getByTestId('task-activity-section')).toHaveJSProperty('isExpanded', true);
    await expect(page.getByTestId('task-activity-opened')).toBeVisible();
    await expect(page.getByTestId('task-drawer-comments').locator('mosaik-comment')).toHaveCount(3);
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
    await expect(page.getByTestId('task-drawer-comments').locator('mosaik-comment')).toHaveCount(4);
    await expect(page.getByTestId('task-drawer-comments')).toContainText(
      'Keep the detail discussion with the ticket.',
    );

    await page.getByTestId('task-description-section').click();
    await expect(page.getByTestId('task-drawer-description')).toBeVisible();
    await page.getByTestId('task-checks-section').click();
    await expect(page.getByTestId('task-ai-delegation')).toBeVisible();
    await expect(page.getByTestId('task-step-by-step-controls')).toBeVisible();

    await page.getByTestId('task-drawer-edit-content').click();
    await expect(page.getByTestId('issue-title')).toBeVisible();
    await expect(page.getByTestId('task-details-section')).toBeVisible();
    await expect(page.getByTestId('task-drawer-comment-draft')).toHaveCount(0);
    await expect(page.getByTestId('issue-save')).toBeVisible();
    await page.getByTestId('issue-title').locator('input').fill('Preview this unsaved ticket');
    await page.getByTestId('task-drawer-edit-content').click();
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Preview this unsaved ticket',
    );
    await expect(page.getByTestId('issue-save')).toBeVisible();
    await page.getByTestId('task-edit-cancel').click();
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Add deterministic workspace reconciliation',
    );
    await expect(page.getByTestId('task-drawer-comment-draft')).toBeVisible();
    await headerClose.click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
