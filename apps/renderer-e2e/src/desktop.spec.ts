// #region Imports

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';
import { desktopChannels, type UpdateState } from '@symphony/ipc-contracts-desktop';
import { type IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { closeSettings } from './closeSettings';
import { expandBoardColumn } from './expandBoardColumn';
import { expectSettingsInMainWindow } from './expectSettingsInMainWindow';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('runs the FLAMOX365-aligned shell and secure Analyzer slice through Electron', async () => {
  // arrange
  test.setTimeout(240_000);
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const expectsNativeWindows = process.env['SYMPHONY_E2E_WINDOW_MODE'] === 'visible';
  const configurationRoot = resolve(outputDirectory, `configuration-${process.pid}`);
  const userSkillsDirectory = resolve(outputDirectory, `skills-${process.pid}`);
  const legacySkillsDirectory = resolve(outputDirectory, `legacy-skills-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
  const app = await electron.launch({
    // No user-data-dir switch: the application relocates Chromium's data into its configuration
    // root by itself, which the assertion below verifies.
    args: ['.'],
    cwd: workspace,
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: userSkillsDirectory,
      SYMPHONY_LEGACY_SKILLS_PATH: legacySkillsDirectory,
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '4000',
      SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS: '12',
    },
  });
  let passed = false;

  // assert
  try {
    const page = await prepareMainWindow(app);
    const applicationVersion = await app.evaluate(({ app: electronApp }) =>
      electronApp.getVersion(),
    );
    expect(
      existsSync(resolve(configurationRoot, 'app-data')),
      'Chromium data belongs inside the configuration root',
    ).toBe(true);
    const expectFullWidthView = async (testId: string): Promise<void> => {
      const widths = await page.getByTestId(testId).evaluate((view) => ({
        page: (view.matches('mosaik-page')
          ? view
          : (view.querySelector('mosaik-page') ?? view)
        ).getBoundingClientRect().width,
        route:
          document.querySelector('[test-id="presenter-route-scroll"]')?.getBoundingClientRect()
            .width ?? 0,
        window: window.innerWidth,
      }));
      expect(widths.page).toBeCloseTo(widths.route, 0);
      // The routed screen takes the whole window beside the 240 px sidebar (239 px and its 1 px
      // divider).
      expect(widths.page).toBeGreaterThanOrEqual(widths.window - 240);
    };
    const dismissNotifications = async (target: Page = page): Promise<void> => {
      const notifications = target.locator(
        '[test-id="notification-success"], [test-id="notification-info"], [test-id="notification-warning"], [test-id="notification-error"]',
      );
      while ((await notifications.count()) > 0) {
        const count = await notifications.count();
        if (count === 0) break;
        await target.keyboard.press('Escape');
        await expect.poll(() => notifications.count(), { timeout: 7_000 }).toBeLessThan(count);
      }
    };
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    const setDialogPaths = async (filePaths: readonly string[]): Promise<void> =>
      app.evaluate(({ dialog }, selectedPaths) => {
        dialog.showOpenDialog = () =>
          Promise.resolve({ canceled: false, filePaths: [...selectedPaths] });
      }, filePaths);
    const publishUpdateState = async (state: UpdateState): Promise<void> =>
      app.evaluate(
        ({ BrowserWindow }, input) => {
          const window = BrowserWindow.getAllWindows().find(
            (candidate) => candidate.webContents.getURL() === input.rendererUrl,
          );
          if (!window) throw new Error('The Symphony main window is unavailable.');
          window.webContents.send(input.channel, input.state);
        },
        { rendererUrl: page.url(), channel: desktopChannels.updateState, state },
      );
    await setDialogPaths([workspace]);
    // Canary: the main process must block every external link before shell.openExternal, so this
    // stub records what would have escaped to the operating-system browser and must stay empty.
    await app.evaluate(({ shell }) => {
      (globalThis as typeof globalThis & { openedExternalUrls?: string[] }).openedExternalUrls = [];
      shell.openExternal = (url) => {
        (
          globalThis as typeof globalThis & { openedExternalUrls: string[] }
        ).openedExternalUrls.push(url);
        return Promise.resolve();
      };
    });
    const escapedExternalUrls = (): Promise<readonly string[] | undefined> =>
      app.evaluate(
        () =>
          (globalThis as typeof globalThis & { openedExternalUrls?: string[] }).openedExternalUrls,
      );
    const blockedExternalUrls = (): Promise<readonly string[] | undefined> =>
      app.evaluate(
        () =>
          (globalThis as typeof globalThis & { blockedExternalUrls?: string[] })
            .blockedExternalUrls,
      );
    await expect(page).toHaveTitle('Symphony');
    // Symphony opens on Overview, the first sidebar destination.
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page).toHaveURL(/\/main\/home/);
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Overview');

    // Window chrome: a 240px source-list sidebar beside the window split's 1px divider, a 52px
    // unified toolbar and a 28px status bar along the whole bottom edge, the routed screen
    // between them.
    const chrome = await page.evaluate(() => {
      const rect = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : undefined;
      };
      return {
        theme: document.documentElement.getAttribute('theme'),
        themeMode: document.documentElement.getAttribute('theme-mode'),
        nativeVibrancy: document.documentElement.getAttribute('data-native-vibrancy'),
        window: { width: window.innerWidth, height: window.innerHeight },
        sidebar: rect('[test-id="window-sidebar"]'),
        toolbar: rect('[test-id="window-toolbar"]'),
        statusBar: rect('[test-id="window-status-bar"]'),
        route: rect('[test-id="presenter-route-scroll"]'),
        overview: rect('[test-id="navigation-home"]'),
        settings: rect('[test-id="navigation-settings"]'),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(chrome.theme).toBe('soho');
    expect(chrome.themeMode).toBe('light');
    expect(chrome.nativeVibrancy).toBe('true');
    // The drawn 240px sidebar is 239px of source list and the 1px split divider; the toolbar
    // starts right after the divider.
    expect(chrome.sidebar?.width).toBe(239);
    expect(chrome.toolbar?.height).toBe(52);
    expect(chrome.toolbar?.x).toBe(240);
    expect(chrome.statusBar?.height).toBe(28);
    expect(chrome.statusBar?.x).toBe(0);
    expect(chrome.statusBar?.width).toBe(chrome.window.width);
    expect((chrome.statusBar?.y ?? 0) + (chrome.statusBar?.height ?? 0)).toBe(chrome.window.height);
    expect(chrome.route?.y).toBe((chrome.toolbar?.y ?? 0) + (chrome.toolbar?.height ?? 0));
    expect((chrome.route?.y ?? 0) + (chrome.route?.height ?? 0)).toBeLessThanOrEqual(
      chrome.statusBar?.y ?? 0,
    );
    expect((chrome.settings?.y ?? 0) + (chrome.settings?.height ?? 0)).toBeLessThanOrEqual(
      chrome.statusBar?.y ?? 0,
    );
    expect(chrome.overview?.height).toBe(32);
    expect(chrome.settings?.y ?? 0).toBeGreaterThan(chrome.overview?.y ?? 0);
    expect(chrome.horizontalOverflow).toBe(false);

    // Overview leads the sidebar, then the Delivery group; Settings is pinned at the bottom and
    // Skills is no longer a main-window destination.
    const destinations = await page
      .getByTestId('presenter-navigation')
      .locator('[test-id^="navigation-"]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute('test-id'))
          .filter((testId): testId is string => Boolean(testId?.match(/^navigation-[a-z-]+$/u))),
      );
    expect(
      destinations.filter(
        (testId) =>
          !testId.startsWith('navigation-group-') && !testId.startsWith('navigation-count-'),
      ),
    ).toEqual([
      'navigation-home',
      'navigation-inbox',
      'navigation-board',
      'navigation-pull-requests',
      'navigation-actions',
      'navigation-orbit',
    ]);
    await expect(page.getByTestId('navigation-group-delivery')).toHaveJSProperty(
      'text',
      'Delivery',
    );
    await expect(page.getByTestId('navigation-skills')).toHaveCount(0);
    await expect(page.getByTestId('navigation-arcade')).toHaveCount(0);
    await expect(page.getByTestId('navigation-settings')).toBeVisible();
    await expect(page.getByTestId('navigation-home')).toHaveAttribute('appearance', 'soft');
    await expect(page.getByTestId('navigation-board')).toHaveAttribute('appearance', 'plain');
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    await expect(page.getByTestId('workspace-switcher')).toBeVisible();
    // Voice input and the former workspace rail are gone from the shell.
    await expect(page.getByTestId('voice-search')).toHaveCount(0);
    await expect(page.getByTestId('toggle-rail')).toHaveCount(0);
    await expect(page.getByTestId('workspace-rail')).toHaveCount(0);
    await expect(page.getByTestId('app-version-watermark')).toHaveText(
      `Symphony v${applicationVersion}`,
    );
    await expect(page.getByTestId('download-available-update')).toHaveCount(0);
    await expect(page.getByTestId('install-ready-update')).toHaveCount(0);
    await expect(page.getByTestId('notification-bell')).toBeVisible();

    // Back and forward follow the router history.
    await expect(page.getByTestId('navigate-back')).toHaveJSProperty('disabled', true);
    await page.getByTestId('navigation-board').click();
    await expect(page).toHaveURL(/\/main\/board/);
    await expect(page.getByTestId('navigation-board')).toHaveAttribute('appearance', 'soft');
    await page.getByTestId('navigate-back').click();
    await expect(page).toHaveURL(/\/main\/home/);
    await expect(page.getByTestId('navigate-forward')).toHaveJSProperty('disabled', false);
    await page.getByTestId('navigate-forward').click();
    await expect(page).toHaveURL(/\/main\/board/);
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // The run panel switches between agents and the current action runs.
    await expect(page.getByTestId('rail-run-segment')).toBeVisible();
    await page.getByTestId('rail-run-segment-actions').click();
    await expect(page.getByTestId('rail-run-segment-actions')).toHaveAttribute(
      'appearance',
      'soft',
    );
    await page.getByTestId('rail-run-segment-agent-runs').click();
    await expect(page.getByTestId('rail-run-segment-agent-runs')).toHaveAttribute(
      'appearance',
      'soft',
    );

    // ⌘K (Ctrl+K off macOS) opens the command palette and Escape closes it.
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);

    // The app-update button lives in the status bar: an icon-only download button, a progress
    // ring that fills while the update downloads, then `Restart to update`.
    await publishUpdateState({
      kind: 'available',
      currentVersion: applicationVersion,
      targetVersion: '98.0.0',
      channel: 'stable',
      lastCheckedAt: '2026-09-04T19:00:00.000Z',
    });
    const downloadAvailableUpdate = page.getByTestId('download-available-update');
    await expect(downloadAvailableUpdate).toBeVisible();
    await expect(downloadAvailableUpdate).toHaveAttribute('aria-label', 'Download Symphony 98.0.0');
    await expect(
      page.getByTestId('window-status-bar').getByTestId('download-available-update'),
    ).toBeVisible();
    await publishUpdateState({
      kind: 'downloading',
      currentVersion: applicationVersion,
      targetVersion: '98.0.0',
      channel: 'stable',
      progress: 0.5,
    });
    await expect(page.getByTestId('update-progress')).toHaveAttribute('aria-valuenow', '50');
    await publishUpdateState({
      kind: 'ready',
      currentVersion: applicationVersion,
      targetVersion: '99.0.0',
      channel: 'stable',
      downloadedAt: '2026-09-04T20:00:00.000Z',
    });
    await expect(page.getByTestId('update-progress')).toHaveCount(0);
    const installReadyUpdate = page.getByTestId('install-ready-update');
    await expect(installReadyUpdate).toBeVisible();
    await expect(installReadyUpdate).toHaveJSProperty('label', 'Restart to update');
    await expect(installReadyUpdate).toHaveAttribute(
      'aria-label',
      'Install Symphony 99.0.0 and restart',
    );
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'desktop-ready-update.png'),
      fullPage: true,
    });
    await publishUpdateState({
      kind: 'disabled',
      reason: 'development',
      currentVersion: applicationVersion,
      channel: 'stable',
    });
    await expect(installReadyUpdate).toHaveCount(0);
    expect(
      await page
        .getByTestId('presenter-content')
        .evaluate((element) => getComputedStyle(element).color),
    ).toBe('rgb(10, 10, 10)');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'macos-window-chrome.png'),
      fullPage: true,
    });

    // `Hide sidebar` collapses the sidebar and the choice survives a reload.
    await page.getByTestId('hide-sidebar').click();
    await expect(page.getByTestId('window-sidebar')).toHaveCount(0);
    await expect(page.getByTestId('show-sidebar')).toBeVisible();
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      app.evaluate(({ BrowserWindow }, rendererUrl) => {
        const window = BrowserWindow.getAllWindows().find(
          (candidate) => candidate.webContents.getURL() === rendererUrl,
        );
        window?.reload();
      }, page.url()),
    ]);
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('window-sidebar')).toHaveCount(0);
    await page.getByTestId('show-sidebar').click();
    await expect(page.getByTestId('window-sidebar')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('presentation.isSidebarCollapsed'))).toBe(
      'false',
    );

    expect(
      await page.evaluate(() => typeof (window as unknown as { process?: unknown }).process),
    ).toBe('undefined');
    expect(
      await page.locator('mosaik-app').evaluate((element) => Boolean(element.shadowRoot)),
    ).toBe(true);

    // A Board card column bar lands on the board narrowed to exactly that column.
    await page.getByTestId('home-board-column-qualified').click();
    await expect(page).toHaveURL(/\/main\/board\?column=qualified/);
    await expect(page.getByTestId('board-column-qualified')).toBeVisible();
    await expect(page.getByTestId('board-column-backlog')).toHaveCount(0);
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await page.getByTestId('board-item-work-item-138').click({ button: 'right' });
    await page.getByTestId('board-item-action-analyze-work-item-138').click();
    // Without a configured repository binding the run is refused before the orchestrator,
    // and the refusal renders through the shared toast pipeline.
    const warningNotification = page.getByTestId('notification-warning').last();
    await expect(warningNotification).toContainText('Choose one repository');
    await expect(warningNotification).toHaveAttribute('variant', 'warning');
    await expect(page.getByTestId('error-banner')).toHaveCount(0);
    await expect(warningNotification).toHaveJSProperty('position', 'bottom-left');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'notification-warning-toast.png'),
      fullPage: true,
    });
    await dismissNotifications();

    const filterMenu = page.getByTestId('board-filter');
    const columnFilter = page.getByTestId('board-column-filter');
    await filterMenu.click();
    await expect(columnFilter).toContainText('Qualified');
    await columnFilter.click();
    await page.getByTestId('board-column-filter-all').click();
    await expect(page.getByTestId('board-column-backlog')).toBeVisible();
    await expect(filterMenu).toHaveJSProperty('isDropDownOpen', false);

    // `Manage workspaces…` in the workspace menu opens Settings inside the main window, whose
    // navigation replaces the sidebar's destinations.
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await expectSettingsInMainWindow(app, page);
    await expect(page.getByTestId('global-workspace-filter')).toHaveCount(0);
    const settings = await openSettings(page);
    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await settings.getByTestId('global-settings-section-workspaces').click();
    await settings.getByTestId('open-workspace-settings-personal').click();
    await expect(settings.getByTestId('workspace-card-personal')).toBeVisible();
    await expect(settings.getByTestId('window-title')).toContainText('AI team');
    await settings.getByTestId('workspace-settings-section-services').click();
    await expect(settings.getByTestId('workspace-card-personal')).toContainText('Azure DevOps');
    await expect(settings.getByTestId('add-repository-personal')).toHaveCount(0);
    await settings.getByTestId('workspace-settings-section-repositories').click();
    await expect(settings.getByTestId('add-repository-personal')).toBeVisible();
    await settings.getByTestId('workspace-settings-section-administration').click();
    await expect(settings.getByTestId('delete-workspace-personal')).toHaveJSProperty(
      'disabled',
      true,
    );
    await expect(settings.getByTestId('export-workspace-personal')).toBeVisible();
    const workspaceTransferDirectory = resolve(
      outputDirectory,
      `workspace-transfer-${process.pid}`,
    );
    rmSync(workspaceTransferDirectory, { force: true, recursive: true });
    mkdirSync(workspaceTransferDirectory, { recursive: true });
    await setDialogPaths([workspaceTransferDirectory]);
    await settings.getByTestId('export-workspace-personal').click();
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Personal exported',
    );
    const exportedWorkspacePath = resolve(
      workspaceTransferDirectory,
      readdirSync(workspaceTransferDirectory).find((name) =>
        name.endsWith('.symphony-workspace.json'),
      )!,
    );
    const exportedWorkspace = JSON.parse(readFileSync(exportedWorkspacePath, 'utf8')) as {
      format: string;
      connections: readonly Record<string, unknown>[];
      repositoryBindings: readonly Record<string, unknown>[];
    };
    expect(exportedWorkspace.format).toBe('symphony.workspace');
    expect(JSON.stringify(exportedWorkspace)).not.toContain('credentialRef');
    expect(JSON.stringify(exportedWorkspace)).not.toContain('accountLogin');
    expect(JSON.stringify(exportedWorkspace)).not.toContain('localPath');
    expect(exportedWorkspace.connections[0]).toMatchObject({ credentialSource: 'isolated' });
    await dismissNotifications(settings);
    await settings.getByTestId('global-settings-section-workspaces').click();
    await expect(settings.getByTestId('import-workspace')).toBeVisible();
    await setDialogPaths([exportedWorkspacePath]);
    await settings.getByTestId('import-workspace').click();
    // Importing is confirmed in an alert sheet of Settings.
    const importConfirmation = settings.getByTestId('settings-alert-workspace-import');
    await expect(importConfirmation).toContainText('Import workspace configuration?');
    await settings.getByTestId('settings-alert-workspace-import-confirm').click();
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Personal updated from bundle',
    );
    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await dismissNotifications(settings);
    await setDialogPaths([workspace]);
    const workspaceStorageRoot = resolve(configurationRoot, 'workspaces');
    const storageDirectoriesBefore = new Set(readdirSync(workspaceStorageRoot));
    await settings.getByTestId('add-workspace').click();
    await settings.getByTestId('workspace-name').locator('input').fill('Temporary workspace');
    await settings.getByTestId('workspace-short-code').locator('input').fill('TMP');
    await settings.getByTestId('choose-workspace-icon').click();
    await settings.getByTestId('workspace-avatar-color-14b8a6').click();
    await settings.getByTestId('workspace-avatar-save').click();
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const temporaryWorkspaceId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      return settings.workspaces.find(
        (workspace) => workspace.displayName === 'Temporary workspace',
      )?.id;
    });
    expect(temporaryWorkspaceId).toBeTruthy();
    // The new workspace joins the directory and the Settings sidebar, and, once Settings is
    // left, the main window's workspace menu switches to it; there is no `All workspaces` scope.
    await settings.getByTestId('global-settings-section-workspaces').click();
    await expect(
      settings.getByTestId(`workspace-directory-item-${temporaryWorkspaceId!}`),
    ).toBeVisible();
    const temporaryWorkspaceNavigation = settings.getByTestId(
      `workspace-navigation-item-${temporaryWorkspaceId!}`,
    );
    await expect(temporaryWorkspaceNavigation).toBeVisible();
    await closeSettings(page);
    await page.getByTestId('global-workspace-filter').click();
    await expect(page.getByTestId('global-workspace-filter-all')).toHaveCount(0);
    await page.getByTestId(`global-workspace-filter-${temporaryWorkspaceId!}`).click();
    await expect(page.getByTestId('workspace-switcher-name')).toHaveJSProperty(
      'text',
      'Temporary workspace',
    );
    await expect
      .poll(async () => {
        const settings = await page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          return api.request('settings.get', {});
        });
        return settings.activeViewScope.workspaceIds;
      })
      .toEqual([temporaryWorkspaceId]);
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('global-workspace-filter-personal').click();
    await expect(page.getByTestId('workspace-switcher-name')).toHaveJSProperty('text', 'Personal');
    await openSettings(page);
    await settings.getByTestId(`open-workspace-settings-${temporaryWorkspaceId!}`).click();
    await settings.getByTestId('workspace-settings-section-administration').click();
    const temporaryStorageDirectory = await expect
      .poll(() => {
        const current = readdirSync(workspaceStorageRoot);
        return current.find((directory) => !storageDirectoriesBefore.has(directory));
      })
      .not.toBeUndefined()
      .then(() =>
        readdirSync(workspaceStorageRoot).find(
          (directory) => !storageDirectoriesBefore.has(directory),
        ),
      );
    expect(temporaryStorageDirectory).toBeTruthy();
    const orphanedExecution = resolve(
      workspaceStorageRoot,
      temporaryStorageDirectory!,
      'executions',
      'execution-delete-e2e',
    );
    mkdirSync(orphanedExecution, { recursive: true });
    writeFileSync(resolve(orphanedExecution, 'workspace-owned.txt'), 'delete me');
    await settings.getByTestId(`delete-workspace-${temporaryWorkspaceId!}`).click();
    // Deleting is confirmed in an alert sheet of Settings.
    const deleteConfirmation = settings.getByTestId(
      `settings-alert-delete-workspace-confirmation-${temporaryWorkspaceId!}`,
    );
    await expect(deleteConfirmation).toContainText('Delete Temporary workspace?');
    await expect(deleteConfirmation).toContainText('Configured repository checkouts are kept');
    await settings
      .getByTestId(`settings-alert-delete-workspace-confirmation-${temporaryWorkspaceId!}-confirm`)
      .click();
    await expect(temporaryWorkspaceNavigation).toHaveCount(0);
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Workspace deleted',
    );
    expect(existsSync(resolve(workspaceStorageRoot, temporaryStorageDirectory!))).toBe(false);
    expect(
      await page.evaluate(async (workspaceId) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const settings = await api.request('settings.get', {});
        return {
          workspace: settings.workspaces.some((workspace) => workspace.id === workspaceId),
          connection: settings.connections.some(
            (connection) => connection.workspaceId === workspaceId,
          ),
        };
      }, temporaryWorkspaceId!),
    ).toEqual({ workspace: false, connection: false });
    await settings.getByTestId('global-settings-section-workspaces').click();
    await settings.getByTestId('open-workspace-settings-personal').click();
    await settings.getByTestId('workspace-settings-section-administration').click();
    await expect(settings.getByTestId('delete-workspace-personal')).toHaveJSProperty(
      'disabled',
      true,
    );
    await settings.getByTestId('workspace-settings-section-services').click();
    const accountGroup = settings.getByTestId('configured-accounts-personal');
    const availableConnections = settings.getByTestId('available-connections-personal');
    await expect(accountGroup).toHaveCount(1);
    await expect(availableConnections).toHaveCount(1);
    await expect
      .poll(() =>
        accountGroup
          .getByTestId(/^configured-account-/)
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('test-id'))),
      )
      .toEqual(['configured-account-personal-codex']);
    await expect
      .poll(() =>
        availableConnections
          .getByTestId(/^(ai-runtime-account-|azure-account-)/)
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('test-id'))),
      )
      .toEqual([
        'ai-runtime-account-codex-personal',
        'ai-runtime-account-claude-personal',
        'ai-runtime-account-opencode-personal',
        'azure-account-personal',
      ]);
    await dismissNotifications(settings);
    await availableConnections.scrollIntoViewIfNeeded();
    await settings.screenshot({
      path: resolve(outputDirectory, 'modular-services-accounts.png'),
      animations: 'disabled',
      fullPage: true,
    });
    await settings.getByTestId('workspace-settings-section-team').click();
    const agentGroup = settings.getByTestId('workspace-agents-personal');
    await expect(agentGroup.locator('[test-id^="workspace-agent-"]')).toHaveCount(1);
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-account-list.png'),
      fullPage: true,
    });
    // This Mac's virtual machines and updates live under System.
    await settings.getByTestId('global-settings-section-system').click();
    await expect(settings.getByTestId('virtual-machines-card')).toBeVisible();
    await expect(settings.getByTestId('virtual-machines-card')).toContainText('Virtual machines');
    await expect(settings.getByTestId('local-ci-reuse-vm')).toHaveJSProperty('isChecked', false);
    await expect(settings.getByTestId('local-ci-resource-preset')).toHaveJSProperty(
      'value',
      'balanced',
    );
    await expect(settings.getByTestId('local-ci-runtime-root')).toContainText(
      resolve(configurationRoot, 'workspaces', 'local-ci'),
    );
    expect(
      await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        try {
          await api.request('ci.local.run', { runId: 'unconfigured-run' });
          return '';
        } catch (cause) {
          return cause instanceof Error ? cause.message : String(cause);
        }
      }),
    ).toContain('Enable local GitHub Actions');
    await expect(settings.getByTestId('update-settings-card')).toBeVisible();
    await expect(settings.getByTestId('update-channel-guide')).toContainText(
      'Stable receives tested releases',
    );
    await expect(settings.getByTestId('update-status')).toContainText(
      'Automatic updates are disabled in development builds.',
    );
    await expect(settings.getByTestId('check-for-updates')).toHaveJSProperty('disabled', true);
    await expect(settings.getByText('Update channel changed.', { exact: true })).toHaveCount(0);
    await settings.getByTestId('global-settings-section-automation').click();
    await expect(settings.getByTestId('runtime-settings-card')).toBeVisible();
    for (const heading of ['Autonomous work', 'GitHub commands', 'Execution']) {
      await expect(settings.getByTestId('runtime-settings-card')).toContainText(heading);
    }
    await expect(settings.getByTestId('runtime-settings-card')).toContainText(
      'Clear inactive workspaces',
    );
    await settings.getByTestId('global-settings-section-mobile').click();
    await expect(settings.getByTestId('mobile-access-card')).toBeVisible();
    await expect(settings.getByTestId('mobile-network-settings-group')).toContainText(
      'Allow mobile access',
    );
    await expect(settings.getByTestId('mobile-network-settings-group')).toContainText(
      'only to phones that you pair and approve',
    );
    await expect(settings.getByTestId('mobile-network-guide')).toContainText(
      'Mac remains the task owner',
    );
    await settings.getByTestId('global-settings-section-appearance').click();
    await expect(settings.getByTestId('theme-settings-card')).toBeVisible();
    await expect(settings.getByTestId('appearance-theme-settings-group')).toContainText(
      'switch between light and dark automatically',
    );

    await settings.getByTestId('global-settings-section-workspaces').click();
    await settings.getByTestId('open-workspace-settings-personal').click();
    await expect(settings.getByTestId('workspace-card-personal')).toBeVisible();
    await settings.getByTestId('edit-agent-account-personal-default-agent').click();
    await expect(settings.getByTestId('settings-editor-loading-skeleton')).toHaveCount(0);
    // Account, model, and effort are card choices; nothing is typed by hand.
    await expect(settings.getByTestId('ai-account')).toBeVisible();
    await expect(settings.getByTestId('ai-account-personal-codex')).toBeVisible();
    await expect(settings.getByTestId('ai-model')).toBeVisible();
    await expect(settings.getByTestId('ai-reasoning')).toBeVisible();
    expect(await settings.getByTestId('ai-model').evaluate((element) => element.tagName)).toBe(
      'MOSAIK-CHOICE-GROUP',
    );
    expect(await settings.getByTestId('ai-reasoning').evaluate((element) => element.tagName)).toBe(
      'MOSAIK-CHOICE-GROUP',
    );
    await expect(settings.getByTestId('ai-model-gpt-5.6-sol')).toBeAttached();
    await expect(settings.getByTestId('ai-reasoning-low')).toBeAttached();
    await expect(settings.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'low');
    // Sign-in, usage type, and account naming moved to Connected services.
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Account name');
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-ai-account-configuration.png'),
      fullPage: true,
    });
    await settings.getByTestId('ai-reasoning-high').click();
    await expect(settings.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'high');
    await expect(settings.getByTestId('save-settings-editor')).toBeEnabled();
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await settings.getByTestId('edit-agent-account-personal-default-agent').click();
    await expect(settings.getByTestId('settings-editor-loading-skeleton')).toHaveCount(0);
    await expect(settings.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'high');
    expect(
      await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const settings = await api.request('settings.get', {});
        return settings.agentRoutePolicies
          .flatMap((policy) => policy.candidates)
          .find((candidate) => candidate.aiConnectionId === 'personal-codex')?.reasoningEffort;
      }),
    ).toBe('high');
    await settings.getByTestId('cancel-settings-editor').click();

    await settings.getByTestId('workspace-settings-section-services').click();
    await settings.getByTestId('add-azure-source-personal').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toBeVisible();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText('Azure DevOps');
    await expect(settings.getByTestId('ado-organization')).toBeVisible();
    await settings.getByTestId('cancel-settings-editor').click();

    await expect(settings.getByTestId('feedback-intake-settings-personal')).toBeVisible();
    await settings.getByTestId('add-teams-feedback-intake-personal').click();
    await expect(settings.getByTestId('teams-feedback-intake-editor')).toBeVisible();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText(
      'Add Microsoft Teams feedback intake',
    );
    await expect(settings.getByTestId('teams-feedback-tenant-id')).toBeVisible();
    await expect(settings.getByTestId('teams-feedback-client-id')).toBeVisible();
    await expect(settings.getByTestId('teams-feedback-credential-ref')).toBeVisible();
    await expect(settings.getByTestId('teams-feedback-team-id')).toBeVisible();
    await expect(settings.getByTestId('teams-feedback-channel-id')).toBeVisible();
    await expect(settings.getByTestId('test-teams-feedback-connection')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await settings.getByTestId('cancel-settings-editor').click();

    // AI accounts are connected once under Connected services …
    await settings.getByTestId('add-ai-runtime-account-claude-personal').click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText(
      'Connect AI account',
    );
    await expect(settings.getByTestId('ai-provider-claude')).toHaveJSProperty('isChecked', true);
    // No Save for a new account: it only exists once the sign-in completed.
    await expect(settings.getByTestId('save-settings-editor')).toHaveCount(0);
    await settings.getByTestId('ai-account-name').locator('input').fill('Secondary Claude account');
    await settings.getByTestId('connect-ai-account').click();
    await expect(settings.getByTestId('ai-authorization-code')).toBeVisible();
    await settings
      .getByTestId('ai-authorization-code')
      .locator('input')
      .fill('e2e-authorization-code');
    await settings.getByTestId('complete-claude-login').click();
    await expect(settings.getByTestId('remove-ai-account')).toBeVisible();
    // The sign-in produced an authorization URL, but it must never leave the app process.
    expect(await blockedExternalUrls()).toContain(
      'https://claude.com/cai/oauth/authorize?state=symphony-e2e',
    );
    expect(await escapedExternalUrls()).toEqual([]);
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(settings.getByTestId('configured-accounts-personal')).toContainText(
      'Secondary Claude account',
    );
    // … and picked by the agent afterwards.
    await settings.getByTestId('workspace-settings-section-team').click();
    await settings.getByTestId('add-ai-account-personal').click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText('Add AI agent');
    await settings
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-claude-"]')
      .click();
    await expect(settings.getByTestId('ai-model-fable')).toBeVisible();
    await expect(settings.getByTestId('ai-model-opus')).toBeVisible();
    await expect(settings.getByTestId('ai-reasoning-high')).toBeVisible();
    await settings.getByTestId('ai-display-name').locator('input').fill('Secondary Claude agent');
    await settings.getByTestId('ai-position-name').locator('input').fill('Review Agent');
    await settings
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Reviews planned and implemented changes.');
    await settings.getByTestId('ai-role-analysis').click();
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(agentGroup.locator('[test-id^="workspace-agent-"]')).toHaveCount(2);
    const secondaryAgent = agentGroup.locator('[test-id^="workspace-agent-"]').last();
    await expect(secondaryAgent).toContainText('Secondary Claude agent');

    // `Import skill` is an action of the Skills section and opens as a sheet.
    await settings.getByTestId('global-settings-section-skills').click();
    await settings.getByTestId('open-skill-import').click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText('Import skill');
    await expect(settings.getByTestId('save-settings-editor')).toHaveJSProperty(
      'label',
      'Import skill',
    );
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-import-drawer.png'),
      fullPage: true,
    });
    await settings.getByTestId('cancel-settings-editor').click();
    await settings.getByTestId('global-settings-section-automation').click();
    await expect(settings.getByTestId('runtime-settings-card')).toBeVisible();
    const boardRefreshInterval = settings.getByTestId('board-refresh-interval').locator('input');
    await expect(boardRefreshInterval).toHaveValue('15');
    // Every Automation control applies when it changes; a number when it is committed.
    await settings.getByTestId('board-refresh-interval').evaluate((element) => {
      (element as HTMLElement & { value: number }).value = 30;
      element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Settings saved',
    );
    const automaticGitHubExecution = settings.getByTestId('automatic-github-execution');
    await expect(automaticGitHubExecution).toHaveJSProperty('isChecked', false);
    await expect(settings.getByTestId('github-automation-settings-group')).toContainText(
      'Allow GitHub commands',
    );
    await expect(settings.getByTestId('autonomy-settings-group')).toContainText(
      'Run autonomous work',
    );
    const commands = settings.getByTestId('remote-github-commands-guide').locator('mosaik-code');
    await expect(commands).toHaveCount(5);
    await expect(commands.first()).toHaveJSProperty('text', '@symphony your instruction');
    await expect(commands.last()).toHaveJSProperty('text', '/symphony rerun-ci');
    await automaticGitHubExecution.click();
    await expect(automaticGitHubExecution).toHaveJSProperty('isChecked', true);
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Settings saved',
    );
    // The virtual machine defaults are stored without a Save button.
    await expect(settings.getByTestId('save-local-ci-settings')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          return (await api.request('settings.get', {})).localCi;
        }),
      )
      .toEqual({ resourcePreset: 'balanced', storageLimitGiB: 32, reuseVirtualMachine: false });

    await settings.getByTestId('global-settings-section-workspaces').click();
    await settings.getByTestId('open-workspace-settings-personal').click();
    await expect(settings.getByTestId('workspace-card-personal')).toBeVisible();
    // Local runs are a workspace decision, so the workspace itself switches them on.
    await settings.getByTestId('workspace-settings-section-local-ci').click();
    // The switch applies at once; there is no Save button.
    await settings.getByTestId('workspace-local-ci-enabled-personal').click();
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Settings saved',
    );
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          return (await api.request('settings.get', {})).workspaces.map(
            (candidate) => candidate.localCiEnabled,
          );
        }),
      )
      .toEqual([true]);
    await settings.getByTestId('workspace-settings-section-repositories').click();
    await settings.getByTestId('add-repository-personal').click();
    await settings.getByTestId('repository-display-name').locator('input').fill('Symphony E2E');
    await settings.getByTestId('choose-repository-local-path').click();
    await expect(
      settings.getByTestId('repository-local-path').locator('input[type="text"]'),
    ).toHaveValue(workspace);
    await settings.getByTestId('repository-owner').locator('input').fill('openai');
    await settings.getByTestId('repository-name').locator('input').fill('symphony');
    await expect(settings.getByTestId('repository-git-protocol')).toHaveJSProperty(
      'value',
      'https',
    );
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(settings.getByTestId('workspace-card-personal')).toContainText('Symphony E2E');
    const configuredRepository = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return (await api.request('settings.get', {})).repositoryBindings.at(-1);
    });
    expect(configuredRepository?.displayName).toBe('Symphony E2E');
    expect(configuredRepository?.id).toBeTruthy();
    await expect(settings.getByTestId(`edit-repository-${configuredRepository!.id}`)).toContainText(
      'Edit',
    );
    await expect(settings.getByText('Plan and run tests', { exact: true })).toHaveCount(0);
    await expect(settings.getByText('Allow AI tasks', { exact: true })).toHaveCount(0);
    await settings.getByTestId('add-repository-personal').click();
    await settings.getByTestId('repository-display-name').locator('input').fill('FLAMOX365 API');
    await settings.getByTestId('repository-owner').locator('input').fill('ruederennes');
    await settings.getByTestId('repository-name').locator('input').fill('platform-api');
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(settings.getByTestId('workspace-repositories-personal')).toContainText(
      'Symphony E2E',
    );
    await expect(settings.getByTestId('workspace-repositories-personal')).toContainText(
      'FLAMOX365 API',
    );
    expect(
      await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return (await api.request('settings.get', {})).repositoryBindings
          .filter((repository) => repository.workspaceId === 'personal')
          .map((repository) => repository.displayName);
      }),
    ).toEqual(expect.arrayContaining(['Symphony E2E', 'FLAMOX365 API']));
    const portableSettings = JSON.parse(
      readFileSync(resolve(configurationRoot, 'settings.json'), 'utf8'),
    ) as { user: { displayName: string }; runtime: Record<string, unknown> };
    const machineSettings = JSON.parse(
      readFileSync(resolve(configurationRoot, 'machine.json'), 'utf8'),
    ) as { workspaceRoot: string; repositoryPaths: Record<string, string> };
    expect(portableSettings.user.displayName).toBe('Operator');
    expect(portableSettings.runtime['workspaceRoot']).toBeUndefined();
    expect(portableSettings.runtime['boardRefreshIntervalMinutes']).toBe(30);
    expect(portableSettings.runtime['automaticExecutionEnabled']).toBe(true);
    expect(portableSettings.runtime['pollingIntervalSeconds']).toBeUndefined();
    expect(Object.values(machineSettings.repositoryPaths)).toContain(workspace);
    if (process.platform !== 'win32') {
      expect(statSync(resolve(configurationRoot, 'settings.json')).mode & 0o777).toBe(0o600);
      expect(statSync(resolve(configurationRoot, 'machine.json')).mode & 0o777).toBe(0o600);
      expect(statSync(resolve(configurationRoot, 'state.sqlite')).mode & 0o777).toBe(0o600);
      expect(statSync(resolve(configurationRoot, 'workspaces')).mode & 0o777).toBe(0o700);
    }
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-configuration.png'),
      fullPage: true,
    });

    // The former Projects route leads to Settings inside the main window instead of a page of
    // its own.
    await closeSettings(page);
    await page.evaluate(() => {
      window.location.hash = '/main/projects';
    });
    await expectSettingsInMainWindow(app, page);
    await closeSettings(page);

    // Skills are built-in process roles now, configured from settings instead of a browsable
    // package catalog, so they must no longer own a main navigation entry.
    await expect(page.getByTestId('navigation-home')).toBeVisible();
    await expect(page.getByTestId('navigation-skills')).toHaveCount(0);
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await expectSettingsInMainWindow(app, page);
    await settings.getByTestId('global-settings-section-skills').click();
    await expect(settings.getByTestId('builtin-skills')).toBeVisible();
    await expect(settings.getByTestId('builtin-skill-analyze')).toContainText('Analyze');
    await expect(settings.getByTestId('builtin-skill-verify')).toContainText('Verify');

    // A role's instructions are edited in its sheet.
    await settings.getByTestId('builtin-skill-edit-analyze').click();
    await expect(settings.getByTestId('builtin-skill-instructions-sheet-analyze')).toBeVisible();
    await settings
      .getByTestId('builtin-skill-instructions-analyze')
      .locator('textarea')
      .fill('Always name the owning Nx project.');
    await settings.getByTestId('builtin-skill-save-analyze').click();
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'The role uses them on its next run.',
    );
    await dismissNotifications(settings);

    expect(
      await page.evaluate(async () => {
        const api = (
          window as unknown as {
            orchestration: {
              request(
                method: 'settings.get',
                payload: Record<string, never>,
              ): Promise<{
                skillCustomizations: Array<{ role: string; additionalInstructions: string }>;
              }>;
            };
          }
        ).orchestration;
        return (await api.request('settings.get', {})).skillCustomizations;
      }),
    ).toEqual([{ role: 'analyze', additionalInstructions: 'Always name the owning Nx project.' }]);

    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'skills-management.png'),
      fullPage: true,
    });
    await closeSettings(page);

    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await expect(page.getByTestId('pull-requests-workspace-filter')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    const pullRequestsRefresh = page
      .getByTestId('window-toolbar-actions')
      .getByTestId('refresh-pull-requests');
    await expect(pullRequestsRefresh).toHaveAttribute('appearance', 'plain');

    await expect(page.getByTestId('navigation-actions')).toBeVisible();
    await page.getByTestId('navigation-actions').click();
    await expect(page.getByTestId('actions-view')).toBeVisible();
    await expect(page.getByTestId('actions-workspace-filter')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    const actionsRefresh = page
      .getByTestId('window-toolbar-actions')
      .getByTestId('refresh-actions');
    await expect(actionsRefresh).toHaveAttribute('appearance', 'plain');
    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();

    // The drawer flows below start AI runs against the simulated items, so the AI team
    // needs an analysis and a solution skill, and the workspace needs a repository binding
    // that resolves the items' "example/platform"; both are arranged through the typed API.
    await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const [settings, analysisSkill, solveSkill] = await Promise.all([
        api.request('settings.get', {}),
        api.request('skills.save', {
          skill: {
            name: 'e2e-analyze-skill',
            description: 'Analysis skill for the desktop end-to-end slice.',
            instructions: 'Analyze the selected work item and return an implementation-ready plan.',
            openaiYaml: '',
            files: [],
          },
        }),
        api.request('skills.save', {
          skill: {
            name: 'e2e-solve-skill',
            description: 'Solution skill for the desktop end-to-end slice.',
            instructions: 'Implement the analyzed work item on a dedicated branch.',
            openaiYaml: '',
            files: [],
          },
        }),
      ]);
      const workspaceId = settings.workspaces[0]!.id;
      const connection = {
        id: 'e2e-platform-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'E2E platform GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'e2e-platform-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'example/platform',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [...settings.connections, connection],
          repositoryBindings: [...settings.repositoryBindings, repository],
          agentTeams: settings.agentTeams.map((team) => ({
            ...team,
            assignments: team.assignments.map((assignment) =>
              assignment.role === 'analysis'
                ? { ...assignment, skillId: analysisSkill.id }
                : assignment.role === 'solution'
                  ? { ...assignment, skillId: solveSkill.id }
                  : assignment,
            ),
          })),
        },
      });
      await api.request('repositories.prepare', { repositoryBindingId: repository.id });
    }, workspace);

    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expectFullWidthView('board-view');
    await expect(page.getByTestId('board-workspace-filter')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    // The refresh is a contextual action of the window toolbar; the board's own controls sit in
    // its filter bar.
    const boardRefresh = page.getByTestId('window-toolbar-actions').getByTestId('refresh-board');
    await expect(boardRefresh).toHaveAttribute('appearance', 'plain');
    await expect(page.getByTestId('board-search')).toHaveCount(0);
    await expect(page.locator('mosaik-flow-board')).toHaveAttribute('gap', '12px');
    await expect(page.locator('mosaik-flow-board-column').first()).toHaveAttribute(
      'appearance',
      'plain',
    );
    await expandBoardColumn(page, 'backlog');
    const boardLayout = await page.evaluate(() => {
      const pageRect = document.querySelector('[test-id="board-view"]')?.getBoundingClientRect();
      const routeRect = document
        .querySelector('[test-id="presenter-route-scroll"]')
        ?.getBoundingClientRect();
      const boardRect = document.querySelector('mosaik-flow-board')?.getBoundingClientRect();
      const columnRects = Array.from(document.querySelectorAll('mosaik-flow-board-column')).map(
        (column) => column.getBoundingClientRect(),
      );
      return {
        pageWidth: pageRect?.width ?? 0,
        routeWidth: routeRect?.width ?? 0,
        windowWidth: window.innerWidth,
        routeBottom: routeRect?.bottom ?? 0,
        boardBottom: boardRect?.bottom ?? 0,
        boardHeight: boardRect?.height ?? 0,
        columnHeights: columnRects.map((column) => column.height),
      };
    });
    expect(boardLayout.pageWidth).toBeCloseTo(boardLayout.routeWidth, 0);
    expect(boardLayout.pageWidth).toBeGreaterThanOrEqual(boardLayout.windowWidth - 240);
    // The board fills the screen down to its bottom padding, whatever the window height.
    expect(boardLayout.boardBottom).toBeGreaterThanOrEqual(boardLayout.routeBottom - 24);
    expect(boardLayout.boardHeight).toBeGreaterThan(400);
    expect(boardLayout.columnHeights.length).toBeGreaterThan(0);
    for (const columnHeight of boardLayout.columnHeights) {
      expect(columnHeight).toBeGreaterThanOrEqual(boardLayout.boardHeight - 24);
    }
    const backlogColumn = page.locator('mosaik-flow-board-column[column-key="backlog"]');
    const backlogViewport = page.getByTestId('board-column-viewport-backlog');
    await expect(backlogColumn).toBeVisible();
    // The bounded CDK viewport owns the virtualized column's vertical scroll: the wheel over a
    // column moves that viewport alone while the FlowBoard's horizontal viewport stays put.
    await expect
      .poll(
        () => backlogViewport.evaluate((viewport) => viewport.scrollHeight - viewport.clientHeight),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0);
    await expect(backlogViewport).toHaveJSProperty('scrollTop', 0);
    await backlogColumn.hover();
    await page.mouse.wheel(0, 1_200);
    await expect
      .poll(() => backlogViewport.evaluate((viewport) => viewport.scrollTop))
      .toBeGreaterThan(0);
    expect(
      await page.locator('mosaik-flow-board').evaluate((board) => {
        const viewport = board.shadowRoot?.querySelector<HTMLElement>('[part~="viewport"]');
        return viewport?.scrollTop ?? 0;
      }),
    ).toBe(0);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'flowboard-column-scroll.png'),
      fullPage: true,
    });
    // The drawer flow below runs an analysis, so it needs the item resting in the stage
    // that owns the analysis; the backlog items around it wait in a human gate.
    const selectedWorkItemId = 'work-item-138';
    expect(rendererErrors).toEqual([]);
    // The item rests in Qualified, which the board starts collapsed.
    await expandBoardColumn(page, 'qualified');
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    // The card opens the work item's own screen.
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(page.getByTestId('task-loading-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('task-drawer-dates')).toContainText('Created');
    await expect(page.getByTestId('task-drawer-dates')).toContainText('Changed');
    expect(
      await page
        .locator('symphony-work-item-view')
        .evaluate((element) => getComputedStyle(element).minHeight),
    ).toBe('0px');
    expect(rendererErrors).toEqual([]);
    expect(await page.locator('symphony-work-item-view').count()).toBe(1);
    await expect(page.getByTestId('selected-work-item')).toHaveCount(0);
    await expect(page.getByTestId('task-drawer-status')).toContainText('Ready to analyze');
    await expect(page.getByTestId('task-drawer-description')).toBeVisible();
    await expect(page.getByTestId('task-activity-section')).toBeVisible();
    await expect(page.getByTestId('task-drawer-comment-draft')).toBeVisible();
    await expect(page.getByTestId('task-step-by-step-controls')).toHaveAttribute('is-expanded', '');
    await expect(page.getByTestId('task-analysis-mode-manual')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('task-analysis-manual')).toBeVisible();
    await expect(page.getByTestId('task-manual-analysis')).toHaveAttribute('variant', 'primary');
    await expect(page.getByTestId('task-analysis-ai')).toHaveCount(0);
    await page.getByTestId('task-analysis-mode-ai').click();
    await expect(page.getByTestId('task-analysis-ai')).toBeVisible();
    await expect(page.getByTestId('task-analysis-skill')).toContainText('e2e-analyze-skill');
    await expect(page.getByTestId('task-analysis-prompt')).toHaveAttribute('variant', 'highlight');
    await page
      .getByTestId('task-analysis-prompt')
      .locator('textarea')
      .fill('Concentrate on renderer boundaries and regression coverage.');
    await expect(page.getByTestId('task-drawer-start')).toBeEnabled();
    await expect(page.getByTestId('task-drawer-start')).toContainText('Analyze task');
    await expect(page.getByTestId('task-drawer-start')).toHaveAttribute('variant', 'highlight');
    await page.getByTestId('task-drawer-start').click();
    await expect(page.getByTestId('task-drawer-events')).toContainText('Analyzer started');
    // The running card is read on the board after a reload, so the screen returns to it first.
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    const boardRendererUrl = page.url();
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      app.evaluate(
        ({ BrowserWindow }, rendererUrl) =>
          BrowserWindow.getAllWindows()
            .find((window) => window.webContents.getURL() === rendererUrl)
            ?.reload(),
        boardRendererUrl,
      ),
    ]);
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toBeVisible();
    // The card names the running step in its status chip and stays pinned while it runs; its
    // five delivery steps say how far the item has come.
    const analysisStatus = page.getByTestId(`board-item-status-${selectedWorkItemId}`);
    await expect(analysisStatus).toBeVisible();
    const analysisStatusLabel = await analysisStatus.evaluate(
      (element) => (element as HTMLElement & { label?: string }).label ?? '',
    );
    if (analysisStatusLabel.endsWith(' running')) {
      await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveJSProperty(
        'pinned',
        true,
      );
    }
    await expect(page.getByTestId(`board-item-progress-${selectedWorkItemId}`)).toHaveAttribute(
      'aria-label',
      /^\d of 5 delivery steps done$/u,
    );
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'board-running-after-reload.png'),
      fullPage: true,
    });
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-drawer-status')).toContainText(/Analyzing|Analyzed/);
    await expect(page.getByTestId('task-drawer-events')).toContainText('Analyzer started');
    await expect
      .poll(
        () =>
          page.evaluate(async (workItemId) => {
            const api = (
              window as unknown as {
                orchestration: {
                  request(
                    method: 'snapshot.get',
                    payload: Record<string, never>,
                  ): Promise<{
                    executions: Array<{ workItemId: string; state: string; summary?: string }>;
                  }>;
                };
              }
            ).orchestration;
            const execution = (await api.request('snapshot.get', {})).executions.find(
              (execution) => execution.workItemId === workItemId,
            );
            return execution?.state === 'succeeded' && Boolean(execution.summary);
          }, selectedWorkItemId),
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect(page.getByTestId('task-drawer-events')).toContainText('Analysis complete', {
      timeout: 20_000,
    });
    // The completion is recorded once in the activity.
    await expect(
      page
        .getByTestId('task-drawer-events')
        .locator('[data-activity-kind]')
        .filter({ hasText: 'Analysis complete' }),
    ).toHaveCount(1);
    await expect(page.getByTestId('task-drawer-status')).toContainText('Analyzed');
    expect(
      await page.evaluate(async (workItemId) => {
        const api = (
          window as unknown as {
            orchestration: {
              request(
                method: 'snapshot.get',
                payload: Record<string, never>,
              ): Promise<{
                executions: Array<{
                  workItemId: string;
                  kind?: string;
                  request?: string;
                }>;
              }>;
            };
          }
        ).orchestration;
        const snapshot = await api.request('snapshot.get', {});
        return snapshot.executions.find(
          (execution) =>
            execution.workItemId === workItemId &&
            (execution.kind === undefined || execution.kind === 'analysis'),
        )?.request;
      }, selectedWorkItemId),
    ).toBe('Concentrate on renderer boundaries and regression coverage.');
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    try {
      await expect(
        page.getByTestId('board-column-ready').getByTestId(`board-item-${selectedWorkItemId}`),
      ).toBeVisible({ timeout: 20_000 });
    } catch (cause) {
      let diagnosticTimeout: ReturnType<typeof setTimeout> | undefined;

      try {
        const diagnostics = await Promise.race([
          page.evaluate(async (workItemId) => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const [process, snapshot] = await Promise.all([
              api.request('workflow.get', { workItemId, auditLimit: 100 }),
              api.request('snapshot.get', {}),
            ]);
            const executions = snapshot.executions
              .filter((execution) => execution.workItemId === workItemId)
              .slice(-5);
            const executionIds = new Set(executions.map((execution) => execution.id));

            return {
              workItemId,
              process,
              workItem: snapshot.workItems.find((item) => item.id === workItemId),
              readiness: snapshot.workItemReadiness?.find((item) => item.workItemId === workItemId),
              executions,
              goals: snapshot.goals.filter((goal) => goal.workItemId === workItemId).slice(0, 5),
              events: snapshot.events
                .filter((event) => executionIds.has(event.executionId))
                .slice(-100),
              workflow: snapshot.workflow,
              boardColumns: snapshot.boardColumns,
            };
          }, selectedWorkItemId),
          new Promise<never>((_resolve, reject) => {
            diagnosticTimeout = setTimeout(
              () => reject(new Error('The desktop readiness diagnostic exceeded five seconds.')),
              5000,
            );
          }),
        ]);

        await test.info().attach('desktop-analysis-readiness', {
          body: JSON.stringify(diagnostics, null, 2),
          contentType: 'application/json',
        });
      } catch (diagnosticFailure) {
        await test
          .info()
          .attach('desktop-analysis-readiness-capture-failed', {
            body: JSON.stringify({
              message:
                diagnosticFailure instanceof Error
                  ? diagnosticFailure.message
                  : 'The desktop readiness diagnostic could not be captured.',
            }),
            contentType: 'application/json',
          })
          .catch(() => undefined);
      } finally {
        clearTimeout(diagnosticTimeout);
      }

      throw cause;
    }
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-loading-skeleton')).toHaveCount(0);
    const renderedTaskAnalysis = await page
      .getByTestId('task-result-markdown')
      .evaluate((element) => ({
        // The Markdown renderer emits Mosaik elements, so block structure is read from those
        // instead of from bare HTML tags.
        heading: element.shadowRoot?.querySelector('.heading')?.textContent,
        strong: element.shadowRoot?.querySelector('.strong')?.textContent,
        listItems: Array.from(
          element.shadowRoot?.querySelectorAll('mosaik-listing-item') ?? [],
        ).map((item) => item.textContent),
        tableHeaders: Array.from(
          element.shadowRoot?.querySelectorAll('mosaik-table-header-cell') ?? [],
        ).map((item) => item.textContent),
        tableCells: Array.from(
          element.shadowRoot?.querySelectorAll('mosaik-table-body-cell') ?? [],
        ).map((item) => item.textContent),
        text: element.shadowRoot?.textContent,
      }));
    expect(renderedTaskAnalysis.heading).toBe('Analysis complete');
    expect(renderedTaskAnalysis.strong).toBe('workspace metadata');
    expect(renderedTaskAnalysis.listItems).toEqual([
      'Recover drifted workspaces',
      'Quarantine unsafe workspaces',
    ]);
    expect(renderedTaskAnalysis.tableHeaders).toEqual(['Area', 'Decision']);
    expect(renderedTaskAnalysis.tableCells).toEqual([
      'Workspace',
      'Recover',
      'Unsafe state',
      'Quarantine',
    ]);
    expect(renderedTaskAnalysis.text).not.toContain('**workspace metadata**');
    const taskUrlBeforeLink = page.url();
    await page
      .getByTestId('task-result-markdown')
      .getByRole('link', { name: 'Open the recovery guide' })
      .click();
    await expect(page).toHaveURL(taskUrlBeforeLink);
    expect(await blockedExternalUrls()).toContain(
      'https://example.com/recovery?source=symphony&mode=analysis',
    );
    expect(await escapedExternalUrls()).toEqual([]);
    expect(
      await page.evaluate(async (workItemId) => {
        const api = (
          window as unknown as {
            orchestration: {
              request(
                method: 'snapshot.get',
                payload: Record<string, never>,
              ): Promise<{
                workItems: Array<{
                  id: string;
                  assignees: Array<{ login: string }>;
                }>;
              }>;
            };
          }
        ).orchestration;
        return (await api.request('snapshot.get', {})).workItems
          .find((item) => item.id === workItemId)
          ?.assignees.map((assignee) => assignee.login);
      }, selectedWorkItemId),
      // Triggering the analysis claimed the ticket, and a claim makes the acting account the
      // only assignee - the previously assigned people are removed by that claim.
    ).toEqual(['simulated-user']);
    // A completed analysis advances the item to the implementation stage. Re-analysis is only
    // valid in the Qualified stage, so move it back through the same board interaction a user
    // would perform before exercising cancellation and restart.
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    const analyzedEntry = page
      .getByTestId(`board-item-${selectedWorkItemId}`)
      .locator('xpath=ancestor::symphony-board-column-entry');
    // Qualified starts as a collapsed strip; the drop target is its expanded column.
    await expandBoardColumn(page, 'qualified');
    const qualifiedColumn = page.getByTestId('board-column-qualified');
    const readyViewport = page.getByTestId('board-column-viewport-ready');
    // The completed card is taller than the viewport; keep its drag origin inside the scrollport.
    await readyViewport.evaluate((viewport) => viewport.scrollTo({ top: 0 }));
    await expect(readyViewport).toHaveJSProperty('scrollTop', 0);
    const analyzedEntryBox = await analyzedEntry.boundingBox();
    const qualifiedColumnBox = await qualifiedColumn.boundingBox();
    expect(analyzedEntryBox).not.toBeNull();
    expect(qualifiedColumnBox).not.toBeNull();
    await page.mouse.move(
      analyzedEntryBox!.x + analyzedEntryBox!.width / 2,
      analyzedEntryBox!.y + 24,
    );
    await page.mouse.down();
    await page.mouse.move(
      qualifiedColumnBox!.x + qualifiedColumnBox!.width / 2,
      qualifiedColumnBox!.y + 120,
      { steps: 20 },
    );
    await page.mouse.up();
    await expect(qualifiedColumn.getByTestId(`board-item-${selectedWorkItemId}`)).toBeVisible();
    // Clear the completed move notification before starting the short cancellation window.
    await dismissNotifications();
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-loading-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('task-step-by-step-controls')).toHaveAttribute('is-expanded', '');
    await page.getByTestId('task-analysis-mode-ai').click();
    await expect(page.getByTestId('task-drawer-start')).toBeEnabled();
    await expect(page.getByTestId('task-drawer-start')).toContainText('Re-analyze');
    await page.getByTestId('task-drawer-start').click();
    await expect(page.getByTestId('task-drawer-cancel-execution')).toBeVisible();
    await expect(page.getByTestId('task-drawer-cancel-execution')).toHaveAttribute(
      'variant',
      'danger',
    );
    await page.getByTestId('task-drawer-cancel-execution').click();
    await expect(page.getByTestId('task-drawer-status')).toContainText('Analysis cancelled');
    await expect(page.getByTestId('task-drawer-events')).toContainText('Execution cancelled');
    await expect(page.getByTestId('task-drawer-start')).toContainText('Restart analysis');
    await expect
      .poll(() =>
        page.evaluate(async (workItemId) => {
          const api = (
            window as unknown as {
              orchestration: {
                request(
                  method: 'snapshot.get',
                  payload: Record<string, never>,
                ): Promise<{
                  executions: Array<{ workItemId: string; state: string }>;
                }>;
              };
            }
          ).orchestration;
          return (await api.request('snapshot.get', {})).executions.some(
            (execution) => execution.workItemId === workItemId && execution.state === 'cancelled',
          );
        }, selectedWorkItemId),
      )
      .toBe(true);
    await expect(page.getByTestId('task-drawer-start')).toBeEnabled();
    await page.getByTestId('task-drawer-start').click();
    await expect
      .poll(
        () =>
          page.evaluate(async (workItemId) => {
            const api = (
              window as unknown as {
                orchestration: {
                  request(
                    method: 'snapshot.get',
                    payload: Record<string, never>,
                  ): Promise<{
                    executions: Array<{
                      workItemId: string;
                      kind?: string;
                      state: string;
                    }>;
                  }>;
                };
              }
            ).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.filter(
              (execution) =>
                execution.workItemId === workItemId &&
                (execution.kind === undefined || execution.kind === 'analysis') &&
                execution.state === 'succeeded',
            ).length;
          }, selectedWorkItemId),
        { timeout: 20_000 },
      )
      .toBe(2);
    await expect(page.getByTestId('task-solution-mode-manual')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('task-solution-manual')).toBeVisible();
    await page.getByTestId('task-solution-mode-ai').click();
    await expect(page.getByTestId('task-drawer-solve')).toContainText('Implement fix');
    await expect(page.getByTestId('task-solution-ai')).toBeVisible();
    await expect(page.getByTestId('task-solution-skill')).toContainText('e2e-solve-skill');
    await expect(page.getByTestId('task-drawer-solve')).toHaveAttribute('variant', 'highlight');
    await page.getByTestId('task-drawer-solve').click();
    await expect(page.getByTestId('task-drawer-status')).toContainText('Solving');
    await expect(page.getByTestId('task-solution-branch')).toContainText(
      /codex\/work-\d+-simulated-implementation/,
    );
    const fullBranchName = await page
      .getByTestId('task-solution-branch')
      .evaluate((element) => (element as HTMLElement & { label?: string }).label ?? '');
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    // While the implementation runs the card rests in `In progress` and stays pinned; its branch
    // is shown on the work-item screen, not on the card.
    await Promise.all([
      expect(
        page.getByTestId('board-column-progress').getByTestId(`board-item-${selectedWorkItemId}`),
      ).toBeAttached(),
      expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveJSProperty('pinned', true),
    ]);
    await expect(page.getByTestId(`board-item-branch-${selectedWorkItemId}`)).toHaveCount(0);
    await expect
      .poll(
        () =>
          page.evaluate(async (workItemId) => {
            const api = (
              window as unknown as {
                orchestration: {
                  request(
                    method: 'snapshot.get',
                    payload: Record<string, never>,
                  ): Promise<{
                    executions: Array<{
                      workItemId: string;
                      kind?: string;
                      state: string;
                    }>;
                  }>;
                };
              }
            ).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.some(
              (execution) =>
                execution.workItemId === workItemId &&
                execution.kind === 'solution' &&
                execution.state === 'succeeded',
            );
          }, selectedWorkItemId),
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveJSProperty(
      'pinned',
      false,
    );
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-drawer-status')).toContainText('Solved');
    await expect(page.getByTestId('task-solution-markdown')).toBeVisible();
    await expect(page.getByTestId('task-create-pull-request')).toBeVisible();
    const unpublishedBranch = page.getByTestId('task-solution-branch');
    expect(await unpublishedBranch.evaluate((element) => element.tagName)).toBe('MOSAIK-CHIP');
    expect(
      await unpublishedBranch.evaluate(
        (element) => (element as HTMLElement & { href?: string }).href,
      ),
    ).toBeUndefined();
    await expect(
      unpublishedBranch.locator('xpath=following-sibling::mosaik-tooltip[1]'),
    ).toHaveJSProperty(
      'content',
      'Local branch · available on GitHub after creating the pull request',
    );
    await page.getByTestId('task-create-pull-request').click();
    await expect(page.getByTestId('task-pull-request')).toContainText(/#\d+/);
    const pullRequestUrl = await page
      .getByTestId('task-pull-request')
      .evaluate((element) => (element as HTMLElement & { href?: string }).href);
    const branchUrl = await page
      .getByTestId('task-solution-branch')
      .evaluate((element) => (element as HTMLElement & { href?: string }).href);
    expect(pullRequestUrl).toMatch(/^https:\/\/github\.com\/.+\/pull\/\d+$/);
    expect(branchUrl).toMatch(/^https:\/\/github\.com\/.+\/tree\/.+$/);
    // The published branch keeps its full name in the inspector's tooltip.
    const publishedBranch = page.getByTestId('task-solution-branch');
    const branchTooltip = publishedBranch.locator('xpath=following-sibling::mosaik-tooltip[1]');
    await expect(branchTooltip).toHaveJSProperty('content', fullBranchName);
    await publishedBranch.hover();
    await expect(branchTooltip).toHaveJSProperty('isOpen', true);
    expect(
      await page.evaluate(async (workItemId) => {
        const api = (
          window as unknown as {
            orchestration: {
              request(
                method: 'snapshot.get',
                payload: Record<string, never>,
              ): Promise<{
                executions: Array<{
                  workItemId: string;
                  kind?: string;
                  workspaceReference?: string;
                }>;
              }>;
            };
          }
        ).orchestration;
        return (await api.request('snapshot.get', {})).executions.find(
          (execution) => execution.workItemId === workItemId && execution.kind === 'solution',
        )?.workspaceReference;
      }, selectedWorkItemId),
    ).toMatch(/^codex\/work-\d+-simulated-implementation$/);
    // The work-item screen opens with manual input; the feedback goes to the AI Solver.
    await expect(page.getByTestId('task-drawer-solve')).toContainText('Record rework');
    await page.getByTestId('task-solution-mode-ai').click();
    await expect(page.getByTestId('task-drawer-solve')).toContainText('Apply feedback');
    await expect(page.getByTestId('task-solution-ai')).toBeVisible();
    await expect(page.getByTestId('task-solver-feedback')).toHaveAttribute('variant', 'highlight');
    await page
      .getByTestId('task-solver-feedback')
      .locator('textarea')
      .fill('Keep the public API stable and add regression coverage.');
    await page.getByTestId('task-drawer-solve').click();
    await expect
      .poll(
        () =>
          page.evaluate(async (workItemId) => {
            const api = (
              window as unknown as {
                orchestration: {
                  request(
                    method: 'snapshot.get',
                    payload: Record<string, never>,
                  ): Promise<{
                    executions: Array<{
                      workItemId: string;
                      kind?: string;
                      state: string;
                      request?: string;
                    }>;
                  }>;
                };
              }
            ).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.some(
              (execution) =>
                execution.workItemId === workItemId &&
                execution.kind === 'revision' &&
                execution.state === 'succeeded' &&
                execution.request === 'Keep the public API stable and add regression coverage.',
            );
          }, selectedWorkItemId),
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect(page.getByTestId('task-solution-markdown')).toContainText('Revision complete');
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(page.getByTestId('task-solution-branch')).toContainText(
      /codex\/work-\d+-simulated-implementation/,
    );
    await expect(page.getByTestId('task-drawer-status')).toContainText('Solved');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'board-task-drawer.png'),
      fullPage: true,
    });
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    // The finished implementation stays on the card as its completed delivery steps.
    await expect(page.getByTestId(`board-item-progress-${selectedWorkItemId}`)).toHaveAttribute(
      'aria-label',
      /^[3-5] of 5 delivery steps done$/u,
    );
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'board-persisted-status.png'),
      fullPage: true,
    });

    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-board-card')).toBeVisible();
    await expect(page.getByTestId('home-board-column-qualified')).toBeVisible();

    const { failedExecutionId, failedAgentId } = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      const qualified = snapshot.boardColumns.find((column) => column.stageId === 'qualified');
      if (!qualified) throw new Error('The simulated board has no Qualified column.');
      const workItemId = 'work-item-142';
      await api.request('work-items.move', { workItemId, boardColumnId: qualified.id });
      const admission = await api.request('analyzer.start', {
        simulateFailure: true,
        workItemId,
      });
      if (admission.outcome !== 'started') throw new Error('The analysis was queued, not started.');
      return {
        failedExecutionId: admission.execution.id,
        failedAgentId: admission.execution.bindingSnapshot?.agentProfileId,
      };
    });
    expect(failedAgentId).toBeTruthy();
    await app.evaluate(({ app: electronApp, dialog }) => {
      const lifecycleState = globalThis as typeof globalThis & {
        quitWarning?: { title?: string; message?: string; detail?: string; buttons?: string[] };
      };
      dialog.showMessageBox = (async (...args: unknown[]) => {
        const options = args.at(-1) as {
          title?: string;
          message?: string;
          detail?: string;
          buttons?: string[];
        };
        lifecycleState.quitWarning = options;
        return { response: 0, checkboxChecked: false };
      }) as typeof dialog.showMessageBox;
      electronApp.quit();
    });
    const mainWindowUrl = page.url();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }, rendererUrl) => {
          const lifecycleState = globalThis as typeof globalThis & {
            quitWarning?: {
              title?: string;
              message?: string;
              detail?: string;
              buttons?: string[];
            };
          };
          return {
            warning: lifecycleState.quitWarning,
            windowVisible:
              BrowserWindow.getAllWindows()
                .find((window) => window.webContents.getURL() === rendererUrl)
                ?.isVisible() ?? false,
          };
        }, mainWindowUrl),
      )
      .toMatchObject({
        warning: {
          title: 'Tasks are still running',
          message: '1 background task is still running.',
          buttons: [
            'Keep running in background',
            'Quit and resume later',
            'Cancel tasks and quit',
            "Don't quit",
          ],
        },
        windowVisible: false,
      });
    await app.evaluate(({ app: electronApp }) => {
      electronApp.emit('second-instance', {} as never, [], '', {});
    });
    await expect
      .poll(() =>
        app.evaluate(
          ({ BrowserWindow }, rendererUrl) =>
            BrowserWindow.getAllWindows()
              .find((window) => window.webContents.getURL() === rendererUrl)
              ?.isVisible() ?? false,
          mainWindowUrl,
        ),
      )
      .toBe(expectsNativeWindows);
    // The run panel lists the agent with the work it is doing; the row opens the live run.
    await page.getByTestId('rail-run-segment-agent-runs').click();
    const liveAgent = page.getByTestId(`rail-agent-${failedAgentId!}`);
    await expect(liveAgent).toHaveAttribute('role', 'button');
    await expect(liveAgent).toHaveAttribute('aria-label', /Analyzing/u);
    await liveAgent.click();
    await expect(page.getByTestId('execution-detail-drawer')).toBeVisible();
    await expect(page.getByTestId('execution-detail-loading-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('execution-stream-progress')).toBeVisible();
    await expect(page.getByTestId('execution-run-stream')).toContainText('Read tracker context', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('execution-run-stream').locator('mosaik-timeline')).toBeVisible();
    await expect(page.getByTestId('execution-run-stream')).toContainText(
      'Simulated agent failure',
      { timeout: 20_000 },
    );
    await expect(page.getByTestId('execution-stream-progress')).toHaveCount(0);
    await expect(
      page.getByTestId('execution-run-stream').locator('mosaik-timeline-marker[variant="info"]'),
    ).not.toHaveCount(0);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'execution-live-stream.png'),
      fullPage: true,
    });
    // The finished run stays open in the same wide drawer, not a dialog, with its failure.
    await expect(page.locator('mosaik-dialog')).toHaveCount(0);
    await expect(page.getByTestId('execution-detail-drawer')).toContainText(
      'Simulated agent failure',
    );
    await expect
      .poll(async () => {
        const box = await page.getByTestId('execution-detail-drawer').boundingBox();
        return box?.width ?? 0;
      })
      .toBeGreaterThan(600);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'execution-detail-drawer.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('execution-detail-drawer')).toHaveCount(0);
    const finalLayout = await page.evaluate(() => {
      const content = document
        .querySelector('[test-id="presenter-content"]')
        ?.getBoundingClientRect();
      const heading = document.querySelector('[test-id="home-greeting"]')?.getBoundingClientRect();
      const widget = document.querySelector('[test-id="home-board-card"]')?.getBoundingClientRect();
      return {
        contentX: content?.x ?? 0,
        headingX: heading?.x ?? 0,
        widgetX: widget?.x ?? 0,
      };
    });
    expect(finalLayout.headingX).toBeGreaterThanOrEqual(finalLayout.contentX + 12);
    expect(finalLayout.widgetX).toBeGreaterThanOrEqual(finalLayout.contentX + 12);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'home-focused.png'),
      fullPage: true,
    });

    // The failed run is counted by Overview's Board card, and the Board's `Needs you` segment
    // narrows to exactly the items whose newest run failed.
    const attentionWorkItemId = await page.evaluate(async (executionId) => {
      const api = (
        window as unknown as {
          orchestration: {
            request(
              method: 'snapshot.get',
              payload: Record<string, never>,
            ): Promise<{ executions: { id: string; workItemId: string }[] }>;
          };
        }
      ).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      return snapshot.executions.find((execution) => execution.id === executionId)?.workItemId;
    }, failedExecutionId);
    expect(attentionWorkItemId).toBeTruthy();
    await expect(page.getByTestId('home-board-card')).toContainText('1 need you');
    await page.getByTestId('home-open-board').click();
    await expect(page).toHaveURL(/\/main\/board/);
    // The board's `Needs you` segment narrows to the failed item; `All` clears it.
    const attentionSegment = page.getByTestId('board-segment-attention');
    await attentionSegment.click();
    await expect(attentionSegment).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId(`board-item-${attentionWorkItemId}`)).toBeVisible();
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveCount(0);
    await page.getByTestId('board-segment-all').click();
    await expect(attentionSegment).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // After the failure the run panel keeps the agent on the item it is blocked on.
    await expect(page.getByTestId(`rail-agent-${failedAgentId!}`)).toHaveAttribute(
      'aria-label',
      /(?:Blocked|Failed) on #142$/u,
    );

    const managedWorkspaceRoot = resolve(configurationRoot, 'workspaces');
    const managedExecutions = () =>
      readdirSync(managedWorkspaceRoot, { recursive: true, withFileTypes: true }).filter(
        (entry) => entry.isDirectory() && /^execution-[a-zA-Z0-9._-]+$/u.test(entry.name),
      );
    expect(managedExecutions()).not.toHaveLength(0);
    // Clearing inactive workspaces is an Automation action of Settings, confirmed in its alert
    // sheet.
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await expectSettingsInMainWindow(app, page);
    const cleanupSettings = await openSettings(page);
    await cleanupSettings.getByTestId('global-settings-section-automation').click();
    await expect(cleanupSettings.getByTestId('clear-workspaces')).toBeVisible();
    await expect(cleanupSettings.getByTestId('clear-workspaces')).toHaveAttribute(
      'variant',
      'danger',
    );
    await cleanupSettings.getByTestId('clear-workspaces').click();
    const cleanupConfirmation = cleanupSettings.getByTestId(
      'settings-alert-clear-workspaces-confirmation',
    );
    await expect(cleanupConfirmation).toContainText('Clear inactive execution workspaces?');
    await expect(cleanupConfirmation).toContainText('Local uncommitted changes');
    await cleanupSettings
      .getByTestId('settings-alert-clear-workspaces-confirmation-confirm')
      .click();
    await expect(cleanupSettings.getByTestId('notification-success').last()).toContainText(
      'Workspaces cleared',
    );
    await expect.poll(managedExecutions).toHaveLength(0);
    await closeSettings(page);
    expect(rendererErrors).toEqual([]);
    expect(
      await page.evaluate(async () => {
        const api = (
          window as unknown as {
            orchestration: {
              request(
                method: 'snapshot.get',
                payload: Record<string, never>,
              ): Promise<{ executions: Array<{ state: string }> }>;
            };
          }
        ).orchestration;
        return (await api.request('snapshot.get', {})).executions.map(
          (execution) => execution.state,
        );
      }),
    ).toEqual(expect.arrayContaining(['succeeded', 'failed', 'cancelled']));
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'shell-reference-alignment.png'),
      fullPage: true,
    });
    // Final canary sweep: nothing in the whole journey may have reached shell.openExternal.
    expect(await escapedExternalUrls()).toEqual([]);
    passed = true;
  } finally {
    await app.close();

    if (passed) {
      rmSync(userSkillsDirectory, { force: true, recursive: true });
      rmSync(legacySkillsDirectory, { force: true, recursive: true });
      rmSync(configurationRoot, { force: true, recursive: true });
    } else {
      await test
        .info()
        .attach('desktop-failure-configuration', {
          body: JSON.stringify(
            { configurationRoot, userSkillsDirectory, legacySkillsDirectory },
            null,
            2,
          ),
          contentType: 'application/json',
        })
        .catch(() => undefined);
    }
  }
});
