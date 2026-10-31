// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import { closeSettings } from './closeSettings';
import { expectSettingsInMainWindow } from './expectSettingsInMainWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

/** Destinations of the main window's sidebar that Settings replaces with its own navigation. */
const SIDEBAR_DESTINATIONS = [
  'workspace-switcher',
  'navigation-home',
  'navigation-inbox',
  'navigation-board',
  'navigation-settings',
  'rail-run-segment',
] as const;

/** Starts the desktop process with disposable storage for one Settings scenario. */
async function launch(
  scenario: string,
): Promise<{ app: ElectronApplication; configurationRoot: string; outputDirectory: string }> {
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `settings-${scenario}-${process.pid}`);
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
  return { app, configurationRoot, outputDirectory };
}

test('opens Settings inside the main window with its navigation, search, sheets and Skills', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launch('navigation');

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await page.getByTestId('navigation-inbox').click();
    await expect(page.getByTestId('inbox-view')).toBeVisible();

    // act
    await page.getByTestId('navigation-settings').click();

    // assert: the Settings navigation replaces the sidebar's destinations, opened on Workspaces.
    await expectSettingsInMainWindow(app, page);
    for (const destination of SIDEBAR_DESTINATIONS)
      await expect(page.getByTestId(destination)).toHaveCount(0);
    await expect(page).toHaveURL(/#\/main\/settings\?section=workspaces$/u);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Workspaces');
    await expect(page.getByTestId('window-subtitle')).toBeVisible();
    await expect(page.getByTestId('navigate-back')).toHaveJSProperty('disabled', false);
    const sidebar = page.getByTestId('window-sidebar-override').getByTestId('settings-sidebar');
    await expect(sidebar.getByTestId('settings-search')).toBeVisible();
    await expect(sidebar.getByTestId('settings-navigation')).toBeVisible();
    await expect(sidebar.getByTestId('global-settings-section-workspaces')).toHaveJSProperty(
      'appearance',
      'soft',
    );
    await expect(sidebar.getByTestId('workspace-navigation-item-personal')).toBeVisible();
    await expect(page.getByTestId('settings-view').getByTestId('settings-content')).toBeVisible();
    await expect(page.getByTestId('workspace-directory')).toBeVisible();
    await expect(sidebar.getByTestId('settings-navigation-symphony')).toHaveJSProperty(
      'text',
      'Symphony',
    );
    const symphonySections = await sidebar
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
    await page.screenshot({ path: resolve(outputDirectory, 'settings-workspaces.png') });

    // Choosing another section updates the toolbar. Skills lives only in Settings and manages
    // the installed skill packages there.
    await sidebar.getByTestId('global-settings-section-skills').click();
    await expect(page).toHaveURL(/#\/main\/settings\?section=skills$/u);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Skills');
    await expect(sidebar.getByTestId('global-settings-section-skills')).toHaveJSProperty(
      'appearance',
      'soft',
    );
    await expect(
      page.getByTestId('window-toolbar-actions').getByTestId('settings-toolbar-actions'),
    ).toBeVisible();
    await expect(page.getByTestId('builtin-skills')).toBeVisible();
    await sidebar.getByTestId('workspace-navigation-item-personal').click();
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'AI team');
    await expect
      .poll(() =>
        page
          .getByTestId('window-subtitle')
          .evaluate((element) => (element as { text?: string }).text ?? ''),
      )
      .toMatch(/^Personal · /u);
    await expect(sidebar.getByTestId('workspace-settings-section-team')).toHaveJSProperty(
      'appearance',
      'soft',
    );

    // Search lists matching settings from every section by breadcrumb.
    await sidebar.getByTestId('settings-search').click();
    await page.keyboard.type('storage');
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Search settings');
    await expect(page.getByTestId('settings-toolbar-actions')).toHaveCount(0);
    await expect(page.getByTestId('settings-search-group-0')).toBeVisible();
    await expect(page.locator('mark[part~="settings-search-match"]').first()).toBeVisible();
    // Individual items are found too, and their result opens the item's own sheet.
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Default Codex account');
    const accountResult = page
      .locator('[test-id^="settings-search-open-"][test-id*=":ai-account-search:"]')
      .first();
    await expect(accountResult).toBeVisible();
    await accountResult.click();
    await expect(page.locator('mosaik-dialog[part~="settings-sheet"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('mosaik-dialog[part~="settings-sheet"]')).toHaveCount(0);
    await sidebar.getByTestId('settings-search').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('tokn');
    await expect(page.getByTestId('settings-search-empty')).toContainText(
      'No setting matches “tokn”',
    );

    // Editors open as sheets and close with Escape, which keeps Settings open.
    await sidebar.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('add-workspace').click();
    await expect(page.locator('mosaik-dialog[part~="settings-sheet"]')).toBeVisible();
    await expect(page.getByTestId('save-settings-editor')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('mosaik-dialog[part~="settings-sheet"]')).toHaveCount(0);
    await expectSettingsInMainWindow(app, page);

    // Leaving Settings restores the sidebar's destinations on the screen it was opened from.
    await closeSettings(page);
    await expect(page).toHaveURL(/#\/main\/inbox/u);
    await expect(page.getByTestId('inbox-view')).toBeVisible();
    for (const destination of SIDEBAR_DESTINATIONS)
      await expect(page.getByTestId(destination)).toBeVisible();
    await expect(page.getByTestId('navigation-inbox')).toHaveAttribute('appearance', 'soft');
    await expect(page.getByTestId('navigation-skills')).toHaveCount(0);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Inbox');
    await expect(page.getByTestId('settings-toolbar-actions')).toHaveCount(0);

    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

test('leaves Settings with a single Back after several sections and shows the previous screen', async () => {
  // arrange
  const { app, configurationRoot } = await launch('history');

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await page.getByTestId('navigation-inbox').click();
    await expect(page.getByTestId('inbox-view')).toBeVisible();
    await page.getByTestId('navigation-settings').click();
    await expectSettingsInMainWindow(app, page);
    await page.getByTestId('global-settings-section-skills').click();
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Skills');
    await page.getByTestId('workspace-navigation-item-personal').click();
    await expect(page).toHaveURL(/#\/main\/settings\?workspace=personal&section=team$/u);
    await page.getByTestId('global-settings-section-system').click();
    await expect(page).toHaveURL(/#\/main\/settings\?section=system$/u);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'System');

    // act
    await page.getByTestId('navigate-back').click();

    // assert: section changes replace their history entry, so one step leaves Settings.
    await expect(page).toHaveURL(/#\/main\/inbox/u);
    await expect(page.getByTestId('inbox-view')).toBeVisible();
    await expect(page.getByTestId('settings-view')).toHaveCount(0);
    await expect(page.getByTestId('window-sidebar-override')).toHaveCount(0);
    for (const destination of SIDEBAR_DESTINATIONS)
      await expect(page.getByTestId(destination)).toBeVisible();
    await expect(page.getByTestId('navigation-inbox')).toHaveAttribute('appearance', 'soft');
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Inbox');
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

test('opens Settings from the app menu and desktop requests inside the main window', async () => {
  // arrange
  const { app, configurationRoot, outputDirectory } = await launch('app-menu');

  try {
    const page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await page.getByTestId('navigation-board').click();
    await expect(page).toHaveURL(/#\/main\/board/u);
    const windowsBefore = app.windows().length;

    // act: the application menu's `Settings…` item, which carries the ⌘, accelerator.
    const menuItem = await app.evaluate(({ Menu }) => {
      const find = (items: readonly Electron.MenuItem[]): Electron.MenuItem | undefined => {
        for (const item of items) {
          if (item.label === 'Settings…') return item;
          const nested = item.submenu ? find(item.submenu.items) : undefined;
          if (nested) return nested;
        }
        return undefined;
      };
      const item = find(Menu.getApplicationMenu()?.items ?? []);
      item?.click();
      return { label: item?.label, accelerator: item?.accelerator };
    });

    // assert
    expect(menuItem).toEqual({ label: 'Settings…', accelerator: 'CmdOrCtrl+,' });
    await expectSettingsInMainWindow(app, page);
    expect(app.windows()).toHaveLength(windowsBefore);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Workspaces');
    await page.screenshot({ path: resolve(outputDirectory, 'settings-app-menu.png') });

    // act: a requested Settings location and `window.show` reuse the same main window.
    const request = (method: string, payload: unknown): Promise<unknown> =>
      page.evaluate(
        ({ name, body }) =>
          (
            window as unknown as {
              desktop: { request(method: string, payload: unknown): Promise<unknown> };
            }
          ).desktop.request(name, body),
        { name: method, body: payload },
      );
    await request('settings.open', { parameters: { section: 'appearance' } });

    // assert
    await expect(page).toHaveURL(/#\/main\/settings\?section=appearance$/u);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Appearance');
    await expectSettingsInMainWindow(app, page);

    // act
    await request('window.show', { route: 'settings' });

    // assert
    await expect(page).toHaveURL(/#\/main\/settings/u);
    await expectSettingsInMainWindow(app, page);
    expect(app.windows()).toHaveLength(windowsBefore);

    // act
    await closeSettings(page);

    // assert: Back returns to the screen Settings was opened from.
    await expect(page).toHaveURL(/#\/main\/board/u);
    await expect(page.getByTestId('navigation-board')).toHaveAttribute('appearance', 'soft');
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
