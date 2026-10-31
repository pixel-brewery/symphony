// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

// #endregion

test('launches and reopens as the active macOS application', async () => {
  // arrange
  test.skip(process.platform !== 'darwin', 'Application activation is a macOS desktop capability.');
  test.skip(
    process.env['SYMPHONY_E2E_WINDOW_MODE'] !== 'visible',
    'Native application activation requires an explicitly visible E2E window.',
  );
  const configurationRoot = resolve(
    'output/playwright',
    `macos-activation-configuration-${process.pid}`,
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
    await expect(page.getByTestId('home-view')).toBeVisible();
    const mainWindowUrl = page.url();

    await expect
      .poll(() => readActivationState(app, mainWindowUrl))
      .toMatchObject({ applicationName: 'Symphony', dockVisible: true, windowVisible: true });
    // macOS may keep the interactive test host in front of a newly launched application. Establish
    // a deterministic focused precondition before testing that Symphony can regain it itself.
    await page.bringToFront();
    await expect
      .poll(() => readActivationState(app, mainWindowUrl))
      .toMatchObject({
        windowFocused: true,
      });

    await app.evaluate(({ BrowserWindow }, rendererUrl) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL() === rendererUrl)
        ?.hide();
    }, mainWindowUrl);
    await expect
      .poll(() => readActivationState(app, mainWindowUrl))
      .toMatchObject({
        windowFocused: false,
        windowVisible: false,
      });

    await app.evaluate(({ app: electronApp }) => {
      electronApp.emit('second-instance', {} as never, [], '', {});
    });

    // assert
    await expect
      .poll(() => readActivationState(app, mainWindowUrl))
      .toEqual({
        applicationName: 'Symphony',
        dockVisible: true,
        windowFocused: true,
        windowVisible: true,
      });
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

async function readActivationState(
  app: Awaited<ReturnType<typeof electron.launch>>,
  rendererUrl: string,
): Promise<{
  readonly applicationName: string | undefined;
  readonly dockVisible: boolean;
  readonly windowFocused: boolean;
  readonly windowVisible: boolean;
}> {
  return app.evaluate(({ app: electronApp, BrowserWindow, Menu }, url) => {
    const window = BrowserWindow.getAllWindows().find(
      (candidate) => candidate.webContents.getURL() === url,
    );
    return {
      applicationName: Menu.getApplicationMenu()?.items[0]?.label,
      dockVisible: electronApp.dock?.isVisible() ?? false,
      windowFocused: window?.isFocused() ?? false,
      windowVisible: window?.isVisible() ?? false,
    };
  }, rendererUrl);
}
