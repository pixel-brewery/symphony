// #region Imports

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

interface IKeepAwakeDesktopApi {
  request(
    method: 'power.get',
    payload: Record<string, never>,
  ): Promise<{
    keepAwakeWhileBusy: boolean;
    engaged: boolean;
    activeTaskCount: number;
  }>;
}

test('holds system sleep only while Symphony has background work', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `keep-awake-settings-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const settingsPath = resolve(configurationRoot, 'keep-awake.json');
  const readPowerState = (page: {
    evaluate: <T>(callback: () => Promise<T>) => Promise<T>;
  }): Promise<{ keepAwakeWhileBusy: boolean; engaged: boolean }> =>
    page.evaluate(async () => {
      const api = (window as unknown as { desktop: IKeepAwakeDesktopApi }).desktop;
      return api.request('power.get', {});
    });

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
    const main = await prepareMainWindow(app);
    const page = await openSettings(main);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await page.getByTestId('global-settings-section-system').click();

    const group = page.getByTestId('keep-awake-settings-group');
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    const toggle = page.getByTestId('keep-awake-while-busy');
    const status = page.getByTestId('keep-awake-status');
    await expect(toggle).toHaveJSProperty('isChecked', false);
    await expect(status).toContainText('This Mac may sleep while Symphony works.');
    expect(existsSync(settingsPath)).toBe(false);

    // The switch applies at once: there is no Save button.

    await toggle.click();
    await expect(toggle).toHaveJSProperty('isChecked', true);
    // Nothing is running yet, so the setting is armed without an assertion being held.
    await expect(status).toContainText('Sleep is allowed while Symphony is idle.');
    await expect
      .poll(() => readPowerState(page))
      .toMatchObject({
        keepAwakeWhileBusy: true,
        engaged: false,
      });
    expect(JSON.parse(readFileSync(settingsPath, 'utf8'))).toMatchObject({
      keepAwakeWhileBusy: true,
    });

    await toggle.click();
    await expect(toggle).toHaveJSProperty('isChecked', false);
    await expect(status).toContainText('This Mac may sleep while Symphony works.');
    expect(JSON.parse(readFileSync(settingsPath, 'utf8'))).toMatchObject({
      keepAwakeWhileBusy: false,
    });

    await group.screenshot({ path: resolve(outputDirectory, 'keep-awake-settings.png') });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
