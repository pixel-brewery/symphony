// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('opens Settings in its own window with the drawn sidebar, search, sheets and Skills', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `settings-window-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
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

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));

    // act
    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => errors.push(error.stack ?? error.message));

    // assert: a second BrowserWindow on `#/settings`, opened on Workspaces.
    expect(app.windows().filter((window) => window.url().includes('#/settings'))).toHaveLength(1);
    await expect(page.getByTestId('window-sidebar')).toBeVisible();
    const sidebar = settings.getByTestId('settings-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(settings.getByTestId('settings-search')).toBeVisible();
    await expect(settings.getByTestId('global-settings-section-workspaces')).toHaveJSProperty(
      'appearance',
      'soft',
    );
    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await expect(settings.getByTestId('settings-navigation-symphony')).toHaveJSProperty(
      'text',
      'Symphony',
    );
    const symphonySections = await settings
      .locator('[test-id^="global-settings-section-"]')
      .evaluateAll((items) =>
        items.map((item) => (item as HTMLElement & { label?: string }).label ?? ''),
      );
    expect(symphonySections).toEqual([
      'Workspaces',
      'Automation',
      'Skills',
      'System',
      'Mobile access',
      'Appearance',
    ]);
    await settings.screenshot({ path: resolve(outputDirectory, 'settings-window-workspaces.png') });

    // Skills lives only in Settings now and manages the installed skill packages there.
    await settings.getByTestId('global-settings-section-skills').click();
    await expect(settings.getByTestId('settings-title-text')).toHaveJSProperty('text', 'Skills');
    await expect(settings.getByTestId('builtin-skills')).toBeVisible();
    await expect(page.getByTestId('navigation-skills')).toHaveCount(0);

    // Search lists matching settings from every section by breadcrumb.
    await settings.getByTestId('settings-search').click();
    await settings.keyboard.type('storage');
    await expect(settings.getByTestId('settings-title-text')).toHaveJSProperty(
      'text',
      'Search settings',
    );
    await expect(settings.getByTestId('settings-search-group-0')).toBeVisible();
    await expect(settings.locator('mark[part~="settings-search-match"]').first()).toBeVisible();
    // Individual items are found too, and their result opens the item's own sheet.
    await settings.keyboard.press('ControlOrMeta+A');
    await settings.keyboard.type('Default Codex account');
    const accountResult = settings
      .locator('[test-id^="settings-search-open-"][test-id*=":ai-account-search:"]')
      .first();
    await expect(accountResult).toBeVisible();
    await accountResult.click();
    await expect(settings.locator('mosaik-dialog[part~="settings-sheet"]')).toBeVisible();
    await settings.keyboard.press('Escape');
    await expect(settings.locator('mosaik-dialog[part~="settings-sheet"]')).toHaveCount(0);
    await settings.getByTestId('settings-search').click();
    await settings.keyboard.press('ControlOrMeta+A');
    await settings.keyboard.type('tokn');
    await expect(settings.getByTestId('settings-search-empty')).toContainText(
      'No setting matches “tokn”',
    );

    // Editors open as sheets and close with Escape.
    await settings.getByTestId('global-settings-section-workspaces').click();
    await settings.getByTestId('add-workspace').click();
    await expect(settings.locator('mosaik-dialog[part~="settings-sheet"]')).toBeVisible();
    await expect(settings.getByTestId('save-settings-editor')).toBeVisible();
    await settings.keyboard.press('Escape');
    await expect(settings.locator('mosaik-dialog[part~="settings-sheet"]')).toHaveCount(0);

    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
