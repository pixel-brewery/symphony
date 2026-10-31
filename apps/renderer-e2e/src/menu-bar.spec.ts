// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Locator } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expectSettingsInMainWindow } from './expectSettingsInMainWindow';

// #endregion

/** The panel's surface and text colours, and whether it is the menu-bar document. */
function panelAppearance(panel: Locator) {
  return panel.evaluate((element) => ({
    menuBarSurface: document.documentElement.dataset['menuBar'],
    nativeVibrancy: document.documentElement.dataset['nativeVibrancy'],
    panelBackground: getComputedStyle(element).backgroundColor,
    panelForeground: getComputedStyle(element).color,
    panelColorScheme: getComputedStyle(element).colorScheme,
  }));
}

test('shows the macOS menu-bar panel with runs, slots, what needs the user and its commands', async () => {
  // arrange
  test.skip(process.platform !== 'darwin', 'The menu-bar extra is a macOS desktop capability.');
  const outputDirectory = resolve('output/playwright');
  const expectsNativeWindows = process.env['SYMPHONY_E2E_WINDOW_MODE'] === 'visible';
  const configurationRoot = resolve(outputDirectory, `menu-bar-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
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
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // assert
  try {
    const mainPage = await app.firstWindow();
    await expect(mainPage.getByTestId('home-view')).toBeVisible();
    await expect.poll(() => app.windows().length).toBeGreaterThanOrEqual(2);
    const panelPage = app.windows().find((page) => page.url().includes('#/menu-bar'));
    expect(panelPage).toBeDefined();
    if (!panelPage) return;
    const rendererErrors: string[] = [];
    panelPage.on('pageerror', (error) => rendererErrors.push(error.message));

    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => {
          const windows = BrowserWindow.getAllWindows();
          const panel = windows.find((window) =>
            window.webContents.getURL().includes('#/menu-bar'),
          );
          const main = windows.find((window) => window.webContents.getURL().includes('#/main'));
          return {
            mainVisible: main?.isVisible() ?? false,
            panelVisible: panel?.isVisible() ?? true,
          };
        }),
      )
      .toEqual({ mainVisible: expectsNativeWindows, panelVisible: false });

    if (expectsNativeWindows) {
      await app.evaluate(({ BrowserWindow }) => {
        const panel = BrowserWindow.getAllWindows().find((window) =>
          window.webContents.getURL().includes('#/menu-bar'),
        );
        panel?.show();
        panel?.focus();
      });
    }

    const panel = panelPage.getByTestId('menu-bar-panel');
    await expect(panel).toBeVisible();

    // The panel follows the app's appearance instead of a forced dark theme: light by default,
    // dark once the appearance is dark.
    await app.evaluate(({ nativeTheme }) => {
      nativeTheme.themeSource = 'light';
    });
    await expect
      .poll(() => panelAppearance(panel))
      .toEqual({
        menuBarSurface: 'true',
        nativeVibrancy: undefined,
        panelBackground: 'rgb(255, 255, 255)',
        panelForeground: 'rgb(10, 10, 10)',
        panelColorScheme: 'light dark',
      });
    await mainPage.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      await api.request('settings.save', {
        settings: { ...settings, user: { ...settings.user, theme: 'dark' } },
      });
    });
    // The hidden panel reads the appearance when it loads or is shown; load it again as a new
    // document (a changed query before the hash) through the main process.
    await app.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('#/menu-bar'),
      );
      if (!window) return;
      const url = new URL(window.webContents.getURL());
      if (url.protocol === 'file:' && url.pathname.endsWith('/')) url.pathname += 'index.html';
      url.searchParams.set('reload', String(Date.now()));
      await window.webContents.loadURL(url.toString());
    });
    await expect
      .poll(() => panelAppearance(panel))
      .toMatchObject({
        panelBackground: 'rgb(23, 23, 23)',
        panelForeground: 'rgb(250, 250, 250)',
      });

    // Header: mark, name, status line and the two icon buttons.
    await expect(panelPage.getByTestId('menu-bar-header')).toContainText('Symphony');
    await expect(panelPage.getByTestId('menu-bar-status-line')).toContainText(
      /(Nothing running|Latest run failed|\d+ running) · Personal/u,
    );
    await expect(panelPage.getByTestId('menu-bar-header-open')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-header-settings')).toBeVisible();
    await expect(panel).toHaveAttribute('data-status', /^(idle|running|failed)$/u);

    // Runs are shown at once and switch between Agents and Actions like the sidebar.
    await expect(panelPage.getByTestId('menu-bar-run-segment')).toBeVisible();
    await panelPage.getByTestId('menu-bar-run-segment-actions').click();
    await expect(panelPage.getByTestId('menu-bar-actions-runs')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-all-runs')).toContainText('All runs in Symphony');
    expect(
      await panelPage.locator('[test-id^="menu-bar-action-run-"]').count(),
    ).toBeLessThanOrEqual(4);
    await panelPage.getByTestId('menu-bar-run-segment-agents').click();
    await expect(panelPage.getByTestId('menu-bar-agent-runs')).toBeVisible();

    // Execution slots, autonomy, the update row and the commands with their shortcuts.
    await expect(panelPage.getByTestId('menu-bar-capacity')).toContainText('Execution slots');
    await expect(panelPage.getByTestId('menu-bar-slots-in-use')).toContainText(
      /\d+ of \d+ in use/u,
    );
    await expect(panelPage.getByTestId('menu-bar-autonomy-toggle')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-update')).toBeVisible();
    for (const command of [
      'menu-bar-open-symphony',
      'menu-bar-new-work-item',
      'menu-bar-open-settings',
      'menu-bar-quit',
    ]) {
      await expect(panelPage.getByTestId(command)).toBeVisible();
    }
    await expect(panelPage.getByTestId('menu-bar-actions').locator('mosaik-kbd')).toHaveCount(4);
    await expect(panelPage.getByTestId('menu-bar-repository-attention')).toHaveCount(0);

    const panelBounds = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('#/menu-bar'),
      );
      return window?.getBounds();
    });
    expect(panelBounds?.width).toBe(328);
    expect(panelBounds?.height).toBeGreaterThanOrEqual(180);
    expect(panelBounds?.height).toBeLessThanOrEqual(760);

    const layout = await panel.evaluate((element) => {
      const top = (testId: string): number =>
        element.querySelector(`[test-id="${testId}"]`)?.getBoundingClientRect().top ?? 0;
      return {
        runsTop: top('menu-bar-runs'),
        capacityTop: top('menu-bar-capacity'),
        autonomyTop: top('menu-bar-autonomy'),
        actionsTop: top('menu-bar-actions'),
      };
    });
    expect(layout.runsTop).toBeLessThan(layout.capacityTop);
    expect(layout.capacityTop).toBeLessThan(layout.autonomyTop);
    expect(layout.autonomyTop).toBeLessThan(layout.actionsTop);
    await panel.screenshot({ path: resolve(outputDirectory, 'menu-bar-panel.png') });

    // `Needs you` links the notification centre of the main window, opened over the start page.
    const notifications = panelPage.getByTestId('menu-bar-notifications');
    await expect(notifications).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-notifications-first')).toContainText(/Codex/u);
    await notifications.click();
    await expect(mainPage).toHaveURL(/#\/main\/home$/u);
    await expect(mainPage.getByTestId('notification-centre')).toBeVisible();
    await mainPage.keyboard.press('Escape');
    await expect(mainPage.getByTestId('notification-centre')).toHaveCount(0);

    // `Settings…` opens Settings inside the main window.
    await panelPage.getByTestId('menu-bar-open-settings').click();
    await expectSettingsInMainWindow(app, mainPage);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
