// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('opens Settings as the final separated workspace-menu destination', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(
    outputDirectory,
    `workspace-settings-navigation-${process.pid}`,
  );
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
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // assert
  try {
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await expect(page.getByTestId('footer-settings')).toHaveCount(0);

    const workspaceFilter = page.getByTestId('global-workspace-filter');
    await workspaceFilter.click();
    await expect(page.getByTestId('global-workspace-filter-personal')).toBeVisible();
    await expect(page.getByTestId('workspace-menu-settings-divider')).toBeVisible();
    const settings = page.getByTestId('workspace-menu-settings');
    await expect(settings).toBeVisible();
    expect(
      await settings.evaluate((element) => ({
        nextTestId: element.nextElementSibling?.getAttribute('test-id') ?? null,
        previousTestId: element.previousElementSibling?.getAttribute('test-id') ?? null,
      })),
    ).toEqual({ nextTestId: null, previousTestId: 'workspace-menu-settings-divider' });
    await page.screenshot({
      path: resolve(outputDirectory, 'workspace-menu-settings.png'),
      fullPage: true,
    });

    await settings.click();
    await expect(workspaceFilter).toHaveJSProperty('isDropDownOpen', false);
    await expect(page).toHaveURL(/\/main\/settings/);
    await expect(page.getByTestId('settings-view')).toBeVisible();
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
