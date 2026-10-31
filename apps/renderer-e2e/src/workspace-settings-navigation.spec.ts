// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('opens Settings in its own window on the workspace list and navigates its nested sections', async () => {
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
    await expect(page.getByTestId('footer-settings')).toHaveCount(0);

    const workspaceFilter = page.getByTestId('global-workspace-filter');
    await workspaceFilter.click();
    await expect(page.getByTestId('global-workspace-filter-personal')).toBeVisible();
    const menuSettings = page.getByTestId('workspace-menu-settings');
    await expect(menuSettings).toBeVisible();
    await page.keyboard.press('Escape');

    // Settings opens in its own window on the workspace list, with the drawn sidebar.
    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('settings-view')).toHaveCount(0);
    await expect(settings.getByTestId('settings-sidebar')).toBeVisible();
    await expect(settings.getByTestId('settings-title-text')).toHaveJSProperty(
      'text',
      'Workspaces',
    );
    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await expect(settings.getByTestId('workspace-navigation-item-personal')).toBeVisible();

    // Opening a workspace shows its six sections as nested rows and selects AI team first.
    await settings.getByTestId('open-workspace-settings-personal').click();
    for (const section of [
      'team',
      'services',
      'repositories',
      'delivery',
      'local-ci',
      'administration',
    ])
      await expect(settings.getByTestId(`workspace-settings-section-${section}`)).toBeVisible();
    await expect(settings.getByTestId('workspace-settings-section-team')).toHaveJSProperty(
      'appearance',
      'soft',
    );
    await expect
      .poll(() =>
        settings
          .getByTestId('settings-subtitle')
          .evaluate((element) => (element as { text?: string }).text ?? ''),
      )
      .toMatch(/^Personal · /u);
    await expect(settings).toHaveURL(/#\/settings\?workspace=personal&section=team/u);

    // A location requested by the main window opens there in the same Settings window.
    await page.evaluate(async () => {
      const desktop = (
        window as unknown as {
          desktop: { request(method: string, payload: unknown): Promise<unknown> };
        }
      ).desktop;
      await desktop.request('settings.open', { parameters: { section: 'system' } });
    });
    await expect(settings.getByTestId('global-settings-section-system')).toHaveJSProperty(
      'appearance',
      'soft',
    );
    await settings.screenshot({
      path: resolve(outputDirectory, 'workspace-settings-navigation.png'),
    });
    expect(app.windows().filter((window) => window.url().includes('#/settings'))).toHaveLength(1);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
