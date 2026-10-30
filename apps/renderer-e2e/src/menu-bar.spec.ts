// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

// #endregion

test('shows the macOS menu-bar panel with operational content above global actions', async () => {
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
    await expect(mainPage.getByTestId('orbit-view')).toBeVisible();
    await expect.poll(() => app.windows().length).toBe(2);
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
          const main = windows.find(
            (window) => !window.webContents.getURL().includes('#/menu-bar'),
          );
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
    await app.evaluate(({ nativeTheme }) => {
      nativeTheme.themeSource = 'light';
    });
    await expect
      .poll(() =>
        panel.evaluate((element) => {
          const menuItem = element.querySelector('mosaik-menu-item');
          const menuItemRoot = menuItem?.shadowRoot?.querySelector('[part="root"]');
          return {
            menuBarSurface: document.documentElement.dataset['menuBar'],
            nativeVibrancy: document.documentElement.dataset['nativeVibrancy'],
            bodyBackground: getComputedStyle(document.body).backgroundColor,
            panelForeground: getComputedStyle(element).color,
            panelColorScheme: getComputedStyle(element).colorScheme,
            menuUsesPanelForeground:
              menuItemRoot !== null &&
              menuItemRoot !== undefined &&
              getComputedStyle(menuItemRoot).color === getComputedStyle(element).color,
          };
        }),
      )
      .toEqual({
        menuBarSurface: 'true',
        nativeVibrancy: undefined,
        bodyBackground: 'rgb(10, 10, 10)',
        panelForeground: 'rgb(250, 250, 250)',
        panelColorScheme: 'light dark',
        menuUsesPanelForeground: true,
      });
    await expect(panelPage.getByTestId('menu-bar-capacity')).toContainText('Capacity');
    await expect(panel).toHaveAttribute('data-status', /^(idle|running|failed)$/u);
    await expect(panelPage.getByTestId('menu-bar-agent-runs')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-actions-runs')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-autonomy-toggle')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-usage')).toHaveCount(0);
    await expect(panelPage.getByTestId('menu-bar-open-symphony')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-update')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-open-settings')).toBeVisible();
    await expect(panelPage.getByTestId('menu-bar-quit')).toBeVisible();

    const panelBounds = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((candidate) =>
        candidate.webContents.getURL().includes('#/menu-bar'),
      );
      return window?.getBounds();
    });
    expect(panelBounds?.width).toBe(328);
    expect(panelBounds?.height).toBeGreaterThanOrEqual(180);
    expect(panelBounds?.height).toBeLessThanOrEqual(620);

    await panelPage.getByTestId('menu-bar-agent-runs').locator('[part="caret"]').click();
    await expect(panelPage.getByTestId('menu-bar-agent-runs-submenu')).toBeVisible();

    await panelPage.getByTestId('menu-bar-actions-runs').locator('[part="caret"]').click();
    await expect(panelPage.getByTestId('menu-bar-actions-runs-submenu')).toBeVisible();
    expect(
      await panelPage.locator('[test-id^="menu-bar-action-run-"]').count(),
    ).toBeLessThanOrEqual(3);

    const layout = await panel.evaluate((element) => {
      const capacity = element.querySelector('[test-id="menu-bar-capacity"]');
      const actions = element.querySelector('[test-id="menu-bar-actions"]');
      return {
        capacityTop: capacity?.getBoundingClientRect().top ?? 0,
        actionsTop: actions?.getBoundingClientRect().top ?? 0,
      };
    });
    expect(layout.capacityTop).toBeLessThan(layout.actionsTop);
    await panel.screenshot({
      path: resolve(outputDirectory, 'menu-bar-panel.png'),
    });

    await panelPage.getByTestId('menu-bar-open-settings').click();
    await expect(mainPage).toHaveURL(/#\/main\/settings$/);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
