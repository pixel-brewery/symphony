// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expectSettingsInMainWindow } from './expectSettingsInMainWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('explains a local CI storage refusal before the bell opens and clears it after recovery', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `local-ci-storage-warning-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
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
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  try {
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      // No CI binding means that enabling the workspace cannot claim a workflow or start a VM.
      if (settings.ciBindings.length)
        throw new Error('The isolated fixture must have no CI bindings.');
      await api.request('settings.save', {
        settings: {
          ...settings,
          workspaces: settings.workspaces.map((workspace) => ({
            ...workspace,
            localCiEnabled: true,
          })),
          runtime: {
            ...settings.runtime,
            automaticExecutionEnabled: false,
            autonomousExecutionEnabled: false,
            // The existing simulated host reports 100 GiB free to the real storage governor.
            minimumFreeDiskGiB: 200,
          },
        },
      });
    });

    // act
    // A fresh renderer must announce the saved refusal without an operator opening the bell.
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      app.evaluate(
        ({ BrowserWindow }, rendererUrl) =>
          BrowserWindow.getAllWindows()
            .find((window) => window.webContents.getURL() === rendererUrl)
            ?.reload(),
        page.url(),
      ),
    ]);

    // assert
    const bell = page.getByTestId('notification-bell');
    const centre = page.getByTestId('notification-centre');
    await expect(bell).toBeVisible();
    await expect(centre).toHaveCount(0);
    const toast = page
      .getByTestId('notification-error')
      .filter({ hasText: 'Local GitHub Actions needs more free space' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('protected reserve: 200.0 GB');

    const admission = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return (await api.request('storage.status.get', {})).localCiAdmission;
    });
    expect(admission.state).toBe('blocked');
    if (admission.state !== 'blocked') throw new Error('Expected a confirmed storage refusal.');
    expect(admission.reason).toBe('filesystem-reserve');
    expect(admission.availableBytes).toBe(100 * 1024 ** 3);
    expect(admission.reserveBytes).toBe(200 * 1024 ** 3);
    expect(admission.requiredGrowthBytes).toBeGreaterThan(0);
    expect(admission.shortfallBytes).toBeGreaterThan(100 * 1024 ** 3);

    await bell.click();
    const problem = page.getByTestId('notification-item-storage:local-ci');
    await expect(problem).toBeVisible();
    await expect(problem).toContainText('Local GitHub Actions needs more free space');
    await expect(problem).toContainText('Mac free: 100.0 GB');
    await expect(problem).toContainText('protected reserve: 200.0 GB');
    await expect(problem).toContainText('required growth:');
    await expect(problem).toContainText('free-space shortfall:');
    // Filesystem pressure must not falsely label the tiny managed fixture as a full quota.
    await expect(page.getByTestId('notification-item-storage:managed')).toHaveCount(0);
    await page.screenshot({ path: resolve(outputDirectory, 'local-ci-storage-warning.png') });

    await page.getByTestId('notification-action-storage:local-ci-review').click();
    await expectSettingsInMainWindow(app, page);
    await expect(centre).toHaveCount(0);
    await expect(page.getByTestId('storage-safety-card')).toBeVisible();
    const reserve = page.getByTestId('minimum-free-disk');
    await expect(reserve).toHaveJSProperty('value', 200);

    // Only this test-owned profile changes; committing a valid reserve refreshes admission.
    const reserveInput = reserve.locator('input');
    await reserveInput.fill('20');
    await reserveInput.press('Tab');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          return (await api.request('storage.status.get', {})).localCiAdmission.state;
        }),
      )
      .toBe('permitted');
    await bell.click();
    await expect(centre).toBeVisible();
    await expect(problem).toHaveCount(0);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
