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
import { expect, test, _electron as electron } from '@playwright/test';
import { desktopChannels, type UpdateState } from '@symphony/ipc-contracts-desktop';
import { type IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('runs the FLAMOX365-aligned shell and secure Analyzer slice through Electron', async () => {
  // arrange
  test.setTimeout(180_000);
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
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '1200',
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
        page:
          (view.matches('mosaik-page')
            ? view
            : view.querySelector('mosaik-page')
          )?.getBoundingClientRect().width ?? 0,
        route:
          document.querySelector('[test-id="presenter-route-scroll"]')?.getBoundingClientRect()
            .width ?? 0,
      }));
      expect(widths.page).toBeCloseTo(widths.route, 0);
      expect(widths.page).toBeGreaterThan(960);
    };
    const expectCenteredPage = async (testId: string, maximumWidth = 960): Promise<void> => {
      const boxes = await page.getByTestId(testId).evaluate((view) => {
        const pageElement = view.matches('mosaik-page') ? view : view.querySelector('mosaik-page');
        const pageBox = pageElement?.getBoundingClientRect();
        const routeElement = document.querySelector<HTMLElement>(
          '[test-id="presenter-route-scroll"]',
        );
        const routeBox = routeElement?.getBoundingClientRect();
        return {
          page: pageBox ? { x: pageBox.x, width: pageBox.width } : undefined,
          route: routeBox
            ? { x: routeBox.x, width: routeElement?.clientWidth ?? routeBox.width }
            : undefined,
        };
      });
      expect(boxes.page?.width).toBeCloseTo(Math.min(boxes.route?.width ?? 0, maximumWidth), 0);
      expect(boxes.page?.x).toBeCloseTo(
        (boxes.route?.x ?? 0) + ((boxes.route?.width ?? 0) - (boxes.page?.width ?? 0)) / 2,
        0,
      );
    };
    const dismissNotifications = async (): Promise<void> => {
      const notifications = page.locator('[test-id^="notification-"]');
      while ((await notifications.count()) > 0) {
        const count = await notifications.count();
        if (count === 0) break;
        await page.keyboard.press('Escape');
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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page).toHaveURL(/\/main\/home/);
    await expectFullWidthView('home-view');
    await expect(page.getByTestId('presenter-navigation')).toBeVisible();
    await expect(page.getByTestId('navigation-actions-badge')).toHaveCount(0);
    await expect(page.getByTestId('toggle-navigation')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    await expect(page.getByTestId('global-workspace-avatar')).toBeVisible();
    await expect(page.getByTestId('app-version-watermark')).toHaveText(`v${applicationVersion}`);
    await expect(page.getByTestId('install-ready-update')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-avatar-group')).toHaveCount(0);
    // The search rests as a launcher button and becomes the field on activation, the way a macOS
    // toolbar search does, so a narrow window spends its width on the navigation instead. The band
    // geometry below is asserted in that resting state.
    await expect(page.getByTestId('global-search-launcher')).toBeVisible();
    await expect(page.getByTestId('global-search-launcher-input')).toHaveCount(0);
    await expect(page.getByTestId('profile-identity')).toHaveCount(0);
    await expect(page.getByTestId('profile-navigation-menu')).toHaveCount(0);
    await expect(page.getByTestId('workspace-ai-banner')).toHaveCount(0);
    await expect(page.getByTestId('footer-workspace-picker')).toHaveCount(0);
    await expect(page.getByTestId('workspace-github-actions-usage')).toHaveCount(0);
    await expect(page.getByTestId('footer-settings')).toHaveCount(0);
    await expect(page.getByTestId('navigation-arcade')).toHaveCount(0);
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await expect(page).toHaveURL(/\/main\/settings/);
    await expect(page.getByTestId('settings-view')).toBeVisible();
    await expect(page.getByTestId('workspace-directory')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('navigation-orbit').click();
    await expect(page).toHaveURL(/\/main\/orbit/);
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('footer-activity')).toHaveCount(0);
    await expect(page.getByTestId('navigation-workflows')).toHaveCount(0);
    await expect(page.getByTestId('navigation-executions')).toHaveCount(0);
    await expect(page.getByTestId('navigation-projects')).toHaveCount(0);
    await expect(page.getByTestId('navigation-home')).toContainText('Overview');
    await expect(page.getByTestId('navigation-orbit')).toContainText('Orbit');
    await expect(page.getByTestId('navigation-settings')).toHaveCount(0);
    // The header is a band across the top of the view. The exact inset is the app view's own
    // border and gap, so this waits for the layout and the relative header/content assertions
    // below pin the geometry.
    await expect
      .poll(() =>
        page
          .locator('mosaik-app > mosaik-app-header')
          .evaluate((element) => element.getBoundingClientRect().x),
      )
      .toBeLessThan(32);

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : undefined;
      };
      return {
        theme: document.documentElement.getAttribute('theme'),
        themeMode: document.documentElement.getAttribute('theme-mode'),
        nativeVibrancy: document.documentElement.getAttribute('data-native-vibrancy'),
        app: rect('mosaik-app'),
        nav: rect('[test-id="presenter-navigation"]'),
        header: rect('mosaik-app > mosaik-app-header'),
        workspaceFilter: rect('[test-id="global-workspace-filter"]'),
        search: rect('[part="search-launcher"]'),
        content: rect('[test-id="presenter-content"]'),
        heading: rect('[test-id="home-greeting"]'),
        toggleRail: rect('[test-id="toggle-rail"]'),
        navFirstItem: rect('[test-id="navigation-home"]'),
        navLastItem: rect('[test-id="navigation-actions"]'),
        titlebarArea: (
          navigator as Navigator & {
            readonly windowControlsOverlay?: {
              readonly visible: boolean;
              getTitlebarAreaRect(): DOMRect;
            };
          }
        ).windowControlsOverlay
          ?.getTitlebarAreaRect()
          .toJSON(),
      };
    });
    expect(layout.theme).toBe('soho');
    expect(layout.themeMode).toBe('light');
    expect(layout.nativeVibrancy).toBe('true');
    // The shell has no side navigation band: the header is one full-width band carrying the
    // workspace picker, the primary navigation segment and the search, with the content directly
    // beneath it.
    expect(layout.content?.x).toBeLessThan(320);
    expect(layout.header?.x).toBeCloseTo(layout.content?.x ?? 0, 0);
    expect(layout.header?.width).toBeCloseTo(layout.content?.width ?? 0, 0);
    // The band takes layout again rather than floating over the content.
    expect(layout.content?.y).toBeGreaterThanOrEqual(
      (layout.header?.y ?? 0) + (layout.header?.height ?? 0) - 1,
    );
    expect(layout.titlebarArea?.x).toBeGreaterThan(0);
    expect(layout.search?.x).toBeGreaterThan(layout.titlebarArea?.x ?? 0);
    expect(
      (layout.workspaceFilter?.x ?? 0) + (layout.workspaceFilter?.width ?? 0),
    ).toBeLessThanOrEqual(layout.search?.x ?? 0);
    expect((layout.search?.x ?? 0) + (layout.search?.width ?? 0)).toBeLessThanOrEqual(
      layout.toggleRail?.x ?? 0,
    );
    // Navigation sits inside the band and remains pinned to its exact horizontal centre rather
    // than following the residual space between the workspace picker and trailing actions.
    expect(layout.nav?.y).toBeGreaterThanOrEqual((layout.header?.y ?? 0) - 1);
    expect((layout.nav?.y ?? 0) + (layout.nav?.height ?? 0)).toBeLessThanOrEqual(
      (layout.header?.y ?? 0) + (layout.header?.height ?? 0) + 1,
    );
    expect(layout.navFirstItem?.x ?? 0).toBeLessThan(layout.navLastItem?.x ?? 0);
    expect(
      (layout.workspaceFilter?.x ?? 0) + (layout.workspaceFilter?.width ?? 0),
    ).toBeLessThanOrEqual(layout.nav?.x ?? 0);
    const bandCentre = (layout.header?.x ?? 0) + (layout.header?.width ?? 0) / 2;
    const navCentre = (layout.nav?.x ?? 0) + (layout.nav?.width ?? 0) / 2;
    expect(Math.abs(navCentre - bandCentre)).toBeLessThanOrEqual(1);
    await publishUpdateState({
      kind: 'available',
      currentVersion: applicationVersion,
      targetVersion: '98.0.0',
      channel: 'stable',
      lastCheckedAt: '2026-09-04T19:00:00.000Z',
    });
    const downloadAvailableUpdate = page.getByTestId('download-available-update');
    await expect(downloadAvailableUpdate).toBeVisible();
    await expect(downloadAvailableUpdate).toHaveAttribute('aria-label', 'Download update 98.0.0');
    await downloadAvailableUpdate.hover();
    await expect(page.getByRole('tooltip')).toContainText('Download update 98.0.0');
    await page.mouse.move(0, 0);
    await publishUpdateState({
      kind: 'ready',
      currentVersion: applicationVersion,
      targetVersion: '99.0.0',
      channel: 'stable',
      downloadedAt: '2026-09-04T20:00:00.000Z',
    });
    await expect(downloadAvailableUpdate).toHaveCount(0);
    const installReadyUpdate = page.getByTestId('install-ready-update');
    await expect(installReadyUpdate).toBeVisible();
    await expect(installReadyUpdate).toHaveAttribute(
      'aria-label',
      'Install update 99.0.0 and restart Symphony',
    );
    await expect(installReadyUpdate).toHaveJSProperty('isBusy', false);
    await installReadyUpdate.hover();
    await expect(page.getByRole('tooltip')).toContainText(
      'Install update 99.0.0 and restart Symphony',
    );
    const updateAction = await installReadyUpdate.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const navigation = document
        .querySelector('[test-id="presenter-navigation"]')
        ?.getBoundingClientRect();
      const search = document
        .querySelector('[test-id="global-search-launcher"]')
        ?.getBoundingClientRect();
      return {
        x: box.x,
        right: box.right,
        navigationRight: navigation?.right,
        searchX: search?.x,
      };
    });
    expect(updateAction.x).toBeGreaterThanOrEqual(updateAction.navigationRight ?? 0);
    expect(updateAction.right).toBeLessThanOrEqual(updateAction.searchX ?? 0);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'desktop-ready-update.png'),
      fullPage: true,
    });
    await page.mouse.move(0, 0);
    await publishUpdateState({
      kind: 'disabled',
      reason: 'development',
      currentVersion: applicationVersion,
      channel: 'stable',
    });
    await expect(installReadyUpdate).toHaveCount(0);
    // The navigation carries labels only; the icons are gone.
    expect(
      await page
        .getByTestId('navigation-board')
        .evaluate((element) => element.shadowRoot?.querySelector('[part="icon"]') ?? null),
    ).toBeNull();
    expect(
      await page
        .getByTestId('presenter-content')
        .evaluate((element) => getComputedStyle(element).color),
    ).toBe('rgb(10, 10, 10)');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'macos-vibrancy-navigation.png'),
      fullPage: true,
    });

    // The search matches against the loaded snapshot; the widget grid renders only from it, so
    // its visibility is the observable "workspace is loaded" state the search contract needs.
    await expect(page.getByTestId('home-column-widgets')).toBeVisible();
    const launcher = page.getByTestId('global-search-launcher');
    if (await launcher.count()) {
      await launcher.click();
    }
    await expect(page.getByTestId('global-search-launcher-input')).toBeVisible();
    const globalSearch = page.getByTestId('global-search-launcher-input').locator('input');
    await globalSearch.fill('Expose execution diagnostics');
    await globalSearch.press('Enter');
    await expect(page).toHaveURL(/\/main\/board\?q=Expose/);
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-142')).toHaveCount(0);
    await globalSearch.press('Escape');
    await expect(page.getByTestId('presenter-navigation')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('global-search-launcher')).toBeVisible();
    await expect(page.getByTestId('global-search-launcher-input')).toHaveCount(0);

    // The navigation segment replaces the compact/expanded side rail and is always visible; there
    // is no navigation toggle any more, and no persisted navigation state to restore.
    await expect(page.getByTestId('presenter-navigation')).toBeVisible();
    await expect(page.getByTestId('navigation-pull-requests')).toBeVisible();

    // The route scrollport starts below the band instead of running underneath it.
    const behindHeader = await page.evaluate(() => {
      const header = document
        .querySelector('mosaik-app > mosaik-app-header')
        ?.getBoundingClientRect();
      const scroll = document.querySelector('[part="route-scroll"]')?.getBoundingClientRect();
      return header && scroll ? scroll.top - header.bottom : -1;
    });
    expect(behindHeader).toBeGreaterThanOrEqual(0);

    // Segment items carry their label beside the icon, so each one is wider than an icon button.
    expect(
      await page
        .getByTestId('navigation-board')
        .evaluate((element) => element.getBoundingClientRect().width),
    ).toBeGreaterThan(48);

    // Keyboard activation of a navigation item. The focusable element is the `<button role="tab">`
    // inside the segment item's shadow root - the host does not set `delegatesFocus`, so focusing
    // it would be a no-op, and Tab reaches the inner button the same way. The segment consumes
    // Enter in a capture-phase keyboard controller and checks the item instead of clicking it, so
    // this asserts the `checked`-driven navigation rather than a synthesised click.
    await page.getByTestId('navigation-board').locator('button').press('Enter');
    await expect(page).toHaveURL(/\/main\/board/);
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    await expect(page.getByTestId('workspace-rail')).toBeHidden();
    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('workspace-rail')).toBeVisible();
    await expect(page.getByTestId('rail-header')).toContainText('Runs');
    await expect(page.getByTestId('rail-run-segment')).toBeVisible();
    expect(await page.getByTestId('rail-run-list').evaluate((element) => element.tagName)).toBe(
      'MOSAIK-LIST',
    );
    await page.getByTestId('presenter-rail-split').evaluate((element) => {
      (element as HTMLElement & { collapse(side: 'start' | 'end'): void }).collapse('start');
    });
    await expect
      .poll(() =>
        page
          .getByTestId('presenter-rail-split')
          .evaluate(
            (element) =>
              (element as HTMLElement & { isStartCollapsed?: boolean }).isStartCollapsed ?? false,
          ),
      )
      .toBe(false);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'rail-reference-alignment.png'),
      fullPage: true,
    });
    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('workspace-rail')).toBeHidden();

    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('workspace-rail')).toBeVisible();
    expect(
      await page.evaluate(() => ({
        rail: localStorage.getItem('presentation.isRailOpen'),
      })),
    ).toEqual({ rail: 'true' });

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
    // Navigation is always there after a reload, and the header band still spans the view edge.
    await expect(page.getByTestId('presenter-navigation')).toBeVisible();
    // The band starts at the view edge. The exact inset is the app view's own border and gap, so
    // this waits for the layout before the relative geometry is pinned.
    await expect
      .poll(() =>
        page
          .locator('mosaik-app > mosaik-app-header')
          .evaluate((element) => element.getBoundingClientRect().x),
      )
      .toBeLessThan(32);
    await expect(page.getByTestId('workspace-rail')).toBeVisible();

    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('workspace-rail')).toBeHidden();
    expect(
      await page.evaluate(() => ({
        rail: localStorage.getItem('presentation.isRailOpen'),
      })),
    ).toEqual({ rail: 'false' });

    expect(
      await page.evaluate(() => typeof (window as unknown as { process?: unknown }).process),
    ).toBe('undefined');
    expect(
      await page.locator('mosaik-app').evaluate((element) => Boolean(element.shadowRoot)),
    ).toBe(true);

    // A column widget lands on the board narrowed to exactly that column.
    await page.getByTestId('home-column-widget-qualified').click();
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

    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await expect(page).toHaveURL(/\/main\/settings/);
    await expect(page.getByTestId('workspace-directory')).toBeVisible();
    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await expect(page.getByTestId('workspace-card-personal')).toBeVisible();
    await expectCenteredPage('settings-view', 1240);
    await expect(page.getByTestId('workspace-card-personal')).toContainText('AI team');
    await page.getByTestId('workspace-settings-section-services').click();
    await expect(page.getByTestId('workspace-card-personal')).toContainText('Azure DevOps');
    await expect(page.getByTestId('add-repository-personal')).toHaveCount(0);
    await page.getByTestId('workspace-settings-section-repositories').click();
    await expect(page.getByTestId('add-repository-personal')).toBeVisible();
    await page.getByTestId('workspace-settings-section-administration').click();
    await expect(page.getByTestId('delete-workspace-personal')).toHaveJSProperty('disabled', true);
    await expect(page.getByTestId('export-workspace-personal')).toBeVisible();
    const workspaceTransferDirectory = resolve(
      outputDirectory,
      `workspace-transfer-${process.pid}`,
    );
    rmSync(workspaceTransferDirectory, { force: true, recursive: true });
    mkdirSync(workspaceTransferDirectory, { recursive: true });
    await setDialogPaths([workspaceTransferDirectory]);
    await page.getByTestId('export-workspace-personal').click();
    await expect(page.getByTestId('notification-success').last()).toContainText(
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
    await dismissNotifications();
    await page.getByTestId('global-settings-section-workspaces').click();
    await expect(page.getByTestId('import-workspace')).toBeVisible();
    await setDialogPaths([exportedWorkspacePath]);
    await page.getByTestId('import-workspace').click();
    const importConfirmation = page.locator('mosaik-message-box').last();
    await expect(importConfirmation).toContainText('Import workspace configuration?');
    await importConfirmation.getByText('Import workspace', { exact: true }).click();
    await expect(page.getByTestId('notification-success').last()).toContainText(
      'Personal updated from bundle',
    );
    await expect(page.getByTestId('workspace-directory')).toBeVisible();
    await dismissNotifications();
    await setDialogPaths([workspace]);
    const workspaceStorageRoot = resolve(configurationRoot, 'workspaces');
    const storageDirectoriesBefore = new Set(readdirSync(workspaceStorageRoot));
    await page.getByTestId('add-workspace').click();
    await page.getByTestId('workspace-name').locator('input').fill('Temporary workspace');
    await page.getByTestId('workspace-short-code').locator('input').fill('TMP');
    await page.getByTestId('workspace-color').locator('input').fill('#038387');
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const temporaryWorkspaceId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      return settings.workspaces.find(
        (workspace) => workspace.displayName === 'Temporary workspace',
      )?.id;
    });
    expect(temporaryWorkspaceId).toBeTruthy();
    const temporaryWorkspaceCard = page.getByTestId(`workspace-card-${temporaryWorkspaceId!}`);
    await expect(temporaryWorkspaceCard).toBeVisible();
    await page.getByTestId('global-workspace-filter').click();
    await expect(page.getByTestId('global-workspace-filter-all')).toHaveCount(0);
    await page.getByTestId(`global-workspace-filter-${temporaryWorkspaceId!}`).click();
    await expect(page.getByTestId('global-workspace-avatar')).toBeVisible();
    await expect(page.getByTestId('global-workspace-avatar-group')).toHaveCount(0);
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
    await page.getByTestId('workspace-settings-section-administration').click();
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
    await page.getByTestId(`delete-workspace-${temporaryWorkspaceId!}`).click();
    const deleteConfirmation = page.locator('mosaik-message-box').last();
    await expect(deleteConfirmation).toContainText('Delete Temporary workspace?');
    await expect(deleteConfirmation).toContainText('Configured repository checkouts are kept');
    await deleteConfirmation.getByText('Delete workspace', { exact: true }).click();
    await expect(temporaryWorkspaceCard).toHaveCount(0);
    await expect(page.getByTestId('notification-success').last()).toContainText(
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
    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await page.getByTestId('workspace-settings-section-administration').click();
    await expect(page.getByTestId('delete-workspace-personal')).toHaveJSProperty('disabled', true);
    await page.getByTestId('workspace-settings-section-services').click();
    const accountGroup = page.getByTestId('configured-accounts-personal');
    const availableConnections = page.getByTestId('available-connections-personal');
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
    await dismissNotifications();
    await availableConnections.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(outputDirectory, 'modular-services-accounts.png'),
      animations: 'disabled',
      fullPage: true,
    });
    await page.getByTestId('workspace-settings-section-team').click();
    const agentGroup = page.getByTestId('workspace-agents-personal');
    await expect(agentGroup.locator('[test-id^="workspace-agent-"]')).toHaveCount(1);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-account-list.png'),
      fullPage: true,
    });
    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('global-settings-section-automation').click();
    await expect(page.getByTestId('virtual-machines-card')).toBeVisible();
    await expect(page.getByTestId('virtual-machines-card')).toContainText('Virtual machines');
    await expect(page.getByTestId('local-ci-reuse-vm')).toHaveJSProperty('isChecked', false);
    await expect(page.getByTestId('local-ci-resource-preset')).toHaveJSProperty(
      'value',
      'balanced',
    );
    await expect(
      page.getByTestId('local-ci-runtime-root').getByRole('textbox', { name: 'Runner data' }),
    ).toHaveValue(resolve(configurationRoot, 'workspaces', 'local-ci'));
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
    await expect(page.getByTestId('runtime-settings-card')).toBeVisible();
    await expect(page.getByTestId('runtime-settings-card')).toContainText('Managed workspaces');
    await expect(page.getByTestId('runtime-settings-card')).toContainText('GitHub issue control');
    await expect(page.getByTestId('runtime-settings-card')).toContainText('Autonomous work');
    await expect(page.getByTestId('runtime-settings-card')).toContainText('Workspace cleanup');
    await page.getByTestId('global-settings-section-mobile').click();
    await expect(page.getByTestId('mobile-access-card')).toBeVisible();
    await expect(page.getByTestId('mobile-access-toggle')).toContainText('Allow mobile access');
    await expect(page.getByTestId('mobile-access-toggle')).toContainText(
      'only to phones that you pair and approve',
    );
    await expect(page.getByTestId('mobile-network-guide')).toContainText(
      'Mac remains the task owner',
    );
    await page.getByTestId('global-settings-section-appearance').click();
    await expect(page.getByTestId('theme-settings-card')).toBeVisible();
    await expect(page.getByTestId('theme-guide')).toContainText(
      'System follows the Mac appearance',
    );
    await page.getByTestId('global-settings-section-system').click();
    await expect(page.getByTestId('update-settings-card')).toBeVisible();
    await expect(page.getByTestId('update-channel-guide')).toContainText(
      'Choose stability or early access',
    );
    await expect(page.getByTestId('update-status')).toContainText(
      'Automatic updates are disabled in development builds.',
    );
    await expect(page.getByTestId('check-for-updates')).toHaveJSProperty('disabled', true);
    await expect(page.getByText('Update channel changed.', { exact: true })).toHaveCount(0);

    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await expect(page.getByTestId('workspace-card-personal')).toBeVisible();
    await page.getByTestId('edit-agent-account-personal-default-agent').click();
    await expect(page.getByTestId('settings-editor-loading-skeleton')).toHaveCount(0);
    // Account, model, and effort are card choices; nothing is typed by hand.
    await expect(page.getByTestId('ai-account')).toBeVisible();
    await expect(page.getByTestId('ai-account-personal-codex')).toBeVisible();
    await expect(page.getByTestId('ai-model')).toBeVisible();
    await expect(page.getByTestId('ai-reasoning')).toBeVisible();
    expect(await page.getByTestId('ai-model').evaluate((element) => element.tagName)).toBe(
      'MOSAIK-CHOICE-GROUP',
    );
    expect(await page.getByTestId('ai-reasoning').evaluate((element) => element.tagName)).toBe(
      'MOSAIK-CHOICE-GROUP',
    );
    await expect(page.getByTestId('ai-model-gpt-5.6-sol')).toBeAttached();
    await expect(page.getByTestId('ai-reasoning-low')).toBeAttached();
    await expect(page.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'low');
    // Sign-in, usage type, and account naming moved to Connected services.
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Account name');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-ai-account-configuration.png'),
      fullPage: true,
    });
    await page.getByTestId('ai-reasoning-high').click();
    await expect(page.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'high');
    await expect(page.getByTestId('save-settings-editor')).toBeEnabled();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await page.getByTestId('edit-agent-account-personal-default-agent').click();
    await expect(page.getByTestId('settings-editor-loading-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'high');
    expect(
      await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const settings = await api.request('settings.get', {});
        return settings.agentRoutePolicies
          .flatMap((policy) => policy.candidates)
          .find((candidate) => candidate.aiConnectionId === 'personal-codex')?.reasoningEffort;
      }),
    ).toBe('high');
    await page.getByTestId('cancel-settings-editor').click();

    await page.getByTestId('workspace-settings-section-services').click();
    await page.getByTestId('add-azure-source-personal').click();
    await expect(page.getByTestId('settings-editor-drawer')).toBeVisible();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Azure DevOps');
    await expect(page.getByTestId('ado-organization')).toBeVisible();
    await page.getByTestId('cancel-settings-editor').click();

    await page.getByTestId('feedback-intake-settings-personal').click();
    await page.getByTestId('add-teams-feedback-intake-personal').click();
    await expect(page.getByTestId('teams-feedback-intake-editor')).toBeVisible();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText(
      'Add Microsoft Teams feedback intake',
    );
    await expect(page.getByTestId('teams-feedback-tenant-id')).toBeVisible();
    await expect(page.getByTestId('teams-feedback-client-id')).toBeVisible();
    await expect(page.getByTestId('teams-feedback-credential-ref')).toBeVisible();
    await expect(page.getByTestId('teams-feedback-team-id')).toBeVisible();
    await expect(page.getByTestId('teams-feedback-channel-id')).toBeVisible();
    await expect(page.getByTestId('test-teams-feedback-connection')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.getByTestId('cancel-settings-editor').click();

    // AI accounts are connected once under Connected services …
    await page.getByTestId('add-ai-runtime-account-claude-personal').click();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Connect AI account');
    await expect(page.getByTestId('ai-provider-claude')).toHaveJSProperty('isChecked', true);
    // No Save for a new account: it only exists once the sign-in completed.
    await expect(page.getByTestId('save-settings-editor')).toHaveCount(0);
    await page.getByTestId('ai-account-name').locator('input').fill('Secondary Claude account');
    await page.getByTestId('connect-ai-account').click();
    await expect(page.getByTestId('ai-authorization-code')).toBeVisible();
    await page.getByTestId('ai-authorization-code').locator('input').fill('e2e-authorization-code');
    await page.getByTestId('complete-claude-login').click();
    await expect(page.getByTestId('remove-ai-account')).toBeVisible();
    // The sign-in produced an authorization URL, but it must never leave the app process.
    expect(await blockedExternalUrls()).toContain(
      'https://claude.com/cai/oauth/authorize?state=symphony-e2e',
    );
    expect(await escapedExternalUrls()).toEqual([]);
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(page.getByTestId('configured-accounts-personal')).toContainText(
      'Secondary Claude account',
    );
    // … and picked by the agent afterwards.
    await page.getByTestId('workspace-settings-section-team').click();
    await page.getByTestId('add-ai-account-personal').click();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Add AI agent');
    await page
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-claude-"]')
      .click();
    await expect(page.getByTestId('ai-model-fable')).toBeVisible();
    await expect(page.getByTestId('ai-model-opus')).toBeVisible();
    await expect(page.getByTestId('ai-reasoning-high')).toBeVisible();
    await page.getByTestId('agent-ai-next').click();
    await page.getByTestId('ai-display-name').locator('input').fill('Secondary Claude agent');
    await page.getByTestId('ai-position-name').locator('input').fill('Review Agent');
    await page
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Reviews planned and implemented changes.');
    await page.getByTestId('agent-identity-next').click();
    await page.getByTestId('ai-role-analysis').click();
    await page.getByTestId('agent-responsibilities-next').click();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(agentGroup.locator('[test-id^="workspace-agent-"]')).toHaveCount(2);
    const secondaryAgent = agentGroup.locator('[test-id^="workspace-agent-"]').last();
    await expect(secondaryAgent).toContainText('Secondary Claude agent');

    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('global-settings-section-system').click();
    await page.getByTestId('open-skill-import').click();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Import skill');
    await expect(page.locator('mosaik-drawer-footer').last()).toContainText('Import skill');
    await expect
      .poll(() =>
        page
          .locator('mosaik-drawer-footer')
          .last()
          .evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return (
              bounds.width > 400 &&
              bounds.left < window.innerWidth - 400 &&
              bounds.right <= window.innerWidth + 20
            );
          }),
      )
      .toBe(true);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-import-drawer.png'),
      fullPage: true,
    });
    await page.getByTestId('cancel-settings-editor').click();
    await page.getByTestId('global-settings-section-automation').click();
    await expect(page.getByTestId('runtime-settings-card')).toBeVisible();
    const boardRefreshInterval = page.getByTestId('board-refresh-interval').locator('input');
    await expect(boardRefreshInterval).toHaveValue('15');
    await page.getByTestId('board-refresh-interval').evaluate((element) => {
      (element as HTMLElement & { value: number }).value = 30;
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    const automaticGitHubExecution = page.getByTestId('automatic-github-execution');
    await expect(automaticGitHubExecution).toHaveJSProperty('isChecked', false);
    await expect(automaticGitHubExecution).toContainText('Allow GitHub commands');
    await expect(automaticGitHubExecution).toContainText('Run authorized @symphony comments');
    await expect(page.getByTestId('autonomous-execution')).toContainText('Run autonomous work');
    await expect(page.getByTestId('autonomous-execution')).toContainText('Analyze backlog items');
    await expect(page.getByTestId('autonomy-capacity-guide')).toContainText(
      'parallel limit applies application-wide',
    );
    await expect(page.getByTestId('remote-github-commands-guide')).toContainText(
      '@symphony your instruction',
    );
    await expect(page.getByTestId('remote-github-commands-guide')).toContainText(
      '/symphony rerun-ci',
    );
    await automaticGitHubExecution.click();
    await expect(automaticGitHubExecution).toHaveJSProperty('isChecked', true);
    await page.getByTestId('save-runtime-settings').click();
    await expect(page.getByTestId('notification-success').last()).toContainText('Settings saved');
    await page.getByTestId('save-local-ci-settings').click();
    await expect(page.getByTestId('notification-success').last()).toContainText('Settings saved');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          return (await api.request('settings.get', {})).localCi;
        }),
      )
      .toEqual({ resourcePreset: 'balanced', storageLimitGiB: 32, reuseVirtualMachine: false });

    await page.getByTestId('global-settings-section-workspaces').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await expect(page.getByTestId('workspace-card-personal')).toBeVisible();
    // Local runs are a workspace decision, so the workspace itself switches them on.
    await page.getByTestId('workspace-settings-section-local-ci').click();
    await page.getByTestId('workspace-local-ci-enabled-personal').click();
    await page.getByTestId('save-workspace-local-ci').click();
    await expect(page.getByTestId('notification-success').last()).toContainText('Settings saved');
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
    await page.getByTestId('workspace-settings-section-repositories').click();
    await page.getByTestId('add-repository-personal').click();
    await page.getByTestId('repository-display-name').locator('input').fill('Symphony E2E');
    await page.getByTestId('choose-repository-local-path').click();
    await expect(
      page.getByTestId('repository-local-path').locator('input[type="text"]'),
    ).toHaveValue(workspace);
    await page.getByTestId('repository-owner').locator('input').fill('openai');
    await page.getByTestId('repository-name').locator('input').fill('symphony');
    await expect(page.getByTestId('repository-git-protocol')).toHaveJSProperty('value', 'https');
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(page.getByTestId('workspace-card-personal')).toContainText('Symphony E2E');
    const configuredRepository = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return (await api.request('settings.get', {})).repositoryBindings.at(-1);
    });
    expect(configuredRepository?.displayName).toBe('Symphony E2E');
    expect(configuredRepository?.id).toBeTruthy();
    await expect(page.getByTestId(`edit-repository-${configuredRepository!.id}`)).toContainText(
      'Edit',
    );
    await expect(page.getByText('Plan and run tests', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Allow AI tasks', { exact: true })).toHaveCount(0);
    await page.getByTestId('add-repository-personal').click();
    await page.getByTestId('repository-display-name').locator('input').fill('FLAMOX365 API');
    await page.getByTestId('repository-owner').locator('input').fill('ruederennes');
    await page.getByTestId('repository-name').locator('input').fill('platform-api');
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(page.getByTestId('workspace-repositories-personal')).toContainText('Symphony E2E');
    await expect(page.getByTestId('workspace-repositories-personal')).toContainText(
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
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-configuration.png'),
      fullPage: true,
    });

    await page.evaluate(() => {
      window.location.hash = '/main/projects';
    });
    await expect(page).toHaveURL(/\/main\/settings/);
    await expect(page.getByTestId('settings-view')).toBeVisible();

    // Skills are built-in process roles now, configured from settings instead of a browsable
    // package catalog, so they must no longer own a main navigation entry.
    await expect(page.getByTestId('navigation-skills')).toHaveCount(0);
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await expect(page.getByTestId('settings-view')).toBeVisible();
    await page.getByTestId('global-settings-section-skills').click();
    await expect(page.getByTestId('builtin-skills')).toBeVisible();
    await expect(page.getByTestId('builtin-skill-analyze')).toContainText('Analyze');
    await expect(page.getByTestId('builtin-skill-verify')).toContainText('Verify');

    await page.getByTestId('builtin-skill-instructions-analyze').evaluate((element) => {
      (element as HTMLElement & { value: string }).value = 'Always name the owning Nx project.';
      element.dispatchEvent(
        new CustomEvent('valueChange', {
          detail: { value: 'Always name the owning Nx project.' },
          bubbles: true,
          composed: true,
        }),
      );
    });
    await page.getByTestId('builtin-skill-save-analyze').click();
    await expect(page.getByTestId('notification-success').last()).toContainText(
      'The role uses them on its next run.',
    );
    await dismissNotifications();

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

    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'skills-management.png'),
      fullPage: true,
    });

    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();
    await expect(page.getByTestId('pull-requests-workspace-filter')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    const pullRequestsRefresh = page.getByTestId('refresh-pull-requests');
    await expect(pullRequestsRefresh).toHaveAttribute('appearance', 'outline');
    expect(await pullRequestsRefresh.evaluate((element) => element.parentElement?.tagName)).toBe(
      'MOSAIK-TOOLBAR',
    );

    await expect(page.getByTestId('navigation-actions')).toBeVisible();
    await page.getByTestId('navigation-actions').click();
    await expect(page.getByTestId('actions-view')).toBeVisible();
    await expect(page.getByTestId('actions-workspace-filter')).toHaveCount(0);
    await expect(page.getByTestId('global-workspace-filter')).toBeVisible();
    const actionsRefresh = page.getByTestId('refresh-actions');
    await expect(actionsRefresh).toHaveAttribute('appearance', 'outline');
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
    const boardRefresh = page.getByTestId('refresh-board');
    await expect(boardRefresh).toHaveAttribute('appearance', 'outline');
    expect(await boardRefresh.evaluate((element) => element.parentElement?.tagName)).toBe(
      'MOSAIK-TOOLBAR',
    );
    await expect(page.getByTestId('board-search')).toHaveCount(0);
    await expect(page.locator('mosaik-flow-board')).toHaveAttribute('gap', '0px');
    await expect(page.locator('mosaik-flow-board-column').first()).toHaveAttribute(
      'appearance',
      'plain',
    );
    await expect(page.locator('[test-id^="board-item-dates-"]').first()).toContainText('Created');
    await expect(page.locator('[test-id^="board-item-dates-"]').first()).toContainText('Changed');
    const boardLayout = await page.evaluate(() => {
      const pageRect = document
        .querySelector('symphony-board-view mosaik-page')
        ?.getBoundingClientRect();
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
        boardHeight: boardRect?.height ?? 0,
        columnHeights: columnRects.map((column) => column.height),
      };
    });
    expect(boardLayout.pageWidth).toBeCloseTo(boardLayout.routeWidth, 0);
    expect(boardLayout.pageWidth).toBeGreaterThan(960);
    expect(boardLayout.boardHeight).toBeGreaterThan(500);
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
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(page.getByTestId('task-loading-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('task-footer-loading-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('task-drawer-dates')).toContainText('Created');
    await expect(page.getByTestId('task-drawer-dates')).toContainText('Last changed');
    expect(
      await page
        .locator('symphony-task-dialog-view')
        .evaluate((element) => getComputedStyle(element).minHeight),
    ).toBe('0px');
    expect(rendererErrors).toEqual([]);
    expect(await page.locator('symphony-task-dialog-view').count()).toBe(1);
    await expect(page.getByTestId('selected-work-item')).toHaveCount(0);
    await expect(page.getByTestId('task-drawer-status')).toContainText('Ready to analyze');
    await expect(page.getByTestId('task-description-section')).toHaveJSProperty(
      'isExpanded',
      false,
    );
    await expect(page.getByTestId('task-activity-section')).toHaveJSProperty('isExpanded', true);
    await expect(page.getByTestId('task-drawer-comment-draft')).toBeVisible();
    await expect(page.getByTestId('task-checks-section')).toHaveJSProperty('isExpanded', false);
    await page.getByTestId('task-checks-section').click();
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
    const analysisStatus = page.getByTestId(`board-item-status-${selectedWorkItemId}`);
    await expect(analysisStatus).toContainText(/Analyzing|Analyzed/);
    const analysisProgressRing = page.getByTestId(`board-item-progress-${selectedWorkItemId}`);
    if ((await analysisStatus.textContent())?.includes('Analyzing')) {
      await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveJSProperty(
        'pinned',
        true,
      );
      await expect(analysisProgressRing).toBeVisible();
      expect(await analysisProgressRing.evaluate((element) => element.tagName)).toBe(
        'MOSAIK-PROGRESS-RING',
      );
      expect(
        await analysisProgressRing.evaluate(
          (element) => (element as HTMLElement & { isIndeterminate?: boolean }).isIndeterminate,
        ),
      ).toBe(true);
    }
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
    await expect(
      page.getByTestId('task-drawer-events').getByText('Analysis complete', { exact: true }),
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
    await page.getByTestId('task-checks-section').click();
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
    await page.getByTestId('task-drawer-header-close').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    const analyzedEntry = page
      .getByTestId(`board-item-${selectedWorkItemId}`)
      .locator('xpath=ancestor::symphony-board-column-entry');
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
    await page.getByTestId('task-checks-section').click();
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
    const solutionProgressRing = page.getByTestId(`board-item-progress-${selectedWorkItemId}`);
    const [solutionProgressRingTag] = await Promise.all([
      solutionProgressRing.evaluate((element) => element.tagName),
      expect(page.getByTestId('task-drawer-status')).toContainText('Solving'),
      expect(
        page.getByTestId('board-column-progress').getByTestId(`board-item-${selectedWorkItemId}`),
      ).toBeAttached(),
      expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveJSProperty('pinned', true),
    ]);
    expect(solutionProgressRingTag).toBe('MOSAIK-PROGRESS-RING');
    await expect(page.getByTestId('task-solution-branch')).toContainText(
      /codex\/work-\d+-simulated-implementation/,
    );
    const boardBranchChip = page.getByTestId(`board-item-branch-${selectedWorkItemId}`);
    await expect(boardBranchChip).toContainText(/codex\/work-\d+-simulated-implementation/);
    await expect(boardBranchChip).toHaveAttribute('size', 'tiny');
    const fullBranchName = await page
      .getByTestId('task-solution-branch')
      .evaluate((element) => (element as HTMLElement & { label?: string }).label ?? '');
    const branchTooltip = boardBranchChip.locator('xpath=following-sibling::mosaik-tooltip[1]');
    await expect(branchTooltip).toHaveJSProperty('content', fullBranchName);
    const branchChipLayout = await boardBranchChip.evaluate((element) => {
      const host = element as HTMLElement;
      return {
        hostWidth: host.getBoundingClientRect().width,
        parentWidth: host.parentElement?.getBoundingClientRect().width ?? 0,
        parentContentWidth: host.parentElement?.scrollWidth ?? 0,
        parentViewportWidth: host.parentElement?.clientWidth ?? 0,
      };
    });
    expect(branchChipLayout.hostWidth).toBeLessThanOrEqual(branchChipLayout.parentWidth + 1);
    expect(branchChipLayout.parentContentWidth).toBeLessThanOrEqual(
      branchChipLayout.parentViewportWidth + 1,
    );
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
    await expect(page.getByTestId('task-drawer-status')).toContainText('Solved');
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveJSProperty(
      'pinned',
      false,
    );
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
    await expect(page.getByTestId('task-pull-request')).toContainText(/PR #\d+/);
    const pullRequestUrl = await page
      .getByTestId('task-pull-request')
      .evaluate((element) => (element as HTMLElement & { href?: string }).href);
    const branchUrl = await page
      .getByTestId('task-solution-branch')
      .evaluate((element) => (element as HTMLElement & { href?: string }).href);
    expect(pullRequestUrl).toMatch(/^https:\/\/github\.com\/.+\/pull\/\d+$/);
    expect(branchUrl).toMatch(/^https:\/\/github\.com\/.+\/tree\/.+$/);
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
    await page.getByTestId('task-drawer-header-close').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await boardBranchChip.hover();
    await expect(branchTooltip).toHaveJSProperty('isOpen', true);
    await page.getByTestId(`board-item-${selectedWorkItemId}`).click();
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText(
      /codex\/work-\d+-simulated-implementation/,
    );
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Solved');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'board-task-drawer.png'),
      fullPage: true,
    });
    await page.getByTestId('task-drawer-header-close').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await expect(page.getByTestId(`board-item-status-${selectedWorkItemId}`)).toContainText(
      'Solved',
    );
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'board-persisted-status.png'),
      fullPage: true,
    });

    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-column-widgets')).toBeVisible();
    await expect(page.getByTestId('home-column-widget-qualified')).toBeVisible();

    await page.getByTestId('toggle-rail').click();
    const failedExecutionId = await page.evaluate(async () => {
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
      return admission.execution.id;
    });
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
    const liveRun = page.getByTestId(`rail-run-${failedExecutionId}`);
    await expect(liveRun).toBeVisible();
    await expect(page.getByTestId(`rail-run-progress-${failedExecutionId}`)).toBeVisible();
    await liveRun.click();
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
    const liveRunTimestamp = page.getByTestId(`rail-run-timestamp-${failedExecutionId}`);
    await expect(liveRunTimestamp).toBeVisible();
    await expect(liveRunTimestamp).toHaveAttribute('datetime', /T/);
    await expect(liveRunTimestamp).not.toHaveText('');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'execution-live-stream.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('execution-detail-drawer')).toHaveCount(0);
    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('workspace-rail')).toBeHidden();
    const finalLayout = await page.evaluate(() => {
      const content = document
        .querySelector('[test-id="presenter-content"]')
        ?.getBoundingClientRect();
      const heading = document.querySelector('[test-id="home-greeting"]')?.getBoundingClientRect();
      const widget = document
        .querySelector('[test-id="home-column-widgets"]')
        ?.getBoundingClientRect();
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

    // The failed run surfaces as the attention widget, and its click-through lands on the
    // board narrowed to exactly the items whose newest run failed.
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
    await expect(page.getByTestId('home-attention-widget')).toBeVisible();
    await page.getByTestId('home-attention-widget').click();
    await expect(page).toHaveURL(/\/main\/board\?attention=true/);
    const attentionFilter = page.getByTestId('board-attention-filter-clear');
    await expect(attentionFilter).toBeVisible();
    await expect(page.getByTestId(`board-item-${attentionWorkItemId}`)).toBeVisible();
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toHaveCount(0);
    await attentionFilter.click();
    await expect(page.getByTestId('board-attention-filter-clear')).toHaveCount(0);
    await expect(page.getByTestId(`board-item-${selectedWorkItemId}`)).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('workspace-rail')).toBeVisible();
    const failedRailExecution = page
      .locator('mosaik-list-item[test-id^="rail-run-"]')
      .filter({ hasText: 'failed' })
      .first();
    await expect(failedRailExecution).toBeVisible();
    await failedRailExecution.click();
    await expect(page.getByTestId('execution-detail-drawer')).toBeVisible();
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

    const managedWorkspaceRoot = resolve(configurationRoot, 'workspaces');
    const managedExecutions = () =>
      readdirSync(managedWorkspaceRoot, { recursive: true, withFileTypes: true }).filter(
        (entry) => entry.isDirectory() && /^execution-[a-zA-Z0-9._-]+$/u.test(entry.name),
      );
    expect(managedExecutions()).not.toHaveLength(0);
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await page.getByTestId('global-settings-section-automation').click();
    await expect(page.getByTestId('clear-workspaces')).toBeVisible();
    await expect(page.getByTestId('clear-workspaces')).toHaveAttribute('variant', 'danger');
    await page.getByTestId('clear-workspaces').click();
    const cleanupConfirmation = page.locator('mosaik-message-box');
    await expect(cleanupConfirmation).toContainText('Clear inactive execution workspaces?');
    await expect(cleanupConfirmation).toContainText('Local uncommitted changes');
    await cleanupConfirmation.getByText('Clear workspaces', { exact: true }).click();
    await expect(page.getByTestId('notification-success').last()).toContainText(
      'Workspaces cleared',
    );
    await expect.poll(managedExecutions).toHaveLength(0);
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
