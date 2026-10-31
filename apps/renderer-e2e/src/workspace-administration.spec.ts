// #region Imports

import { mkdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

for (const enabled of [false, true]) {
  test(`only saves workspace administration after a change when delivery grouping starts ${enabled ? 'enabled' : 'disabled'}`, async () => {
    // arrange
    const outputDirectory = resolve('output/playwright');
    const configurationRoot = resolve(
      outputDirectory,
      `workspace-administration-${enabled}-${process.pid}`,
    );
    const settingsPath = resolve(configurationRoot, 'settings.json');
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
      page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
      const workspaceId = await page.evaluate(async (automaticDeliveryGroupingEnabled) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const settings = await api.request('settings.get', {});
        const workspaceId = settings.workspaces[0]!.id;
        await api.request('settings.save', {
          settings: {
            ...settings,
            workspaces: settings.workspaces.map((workspace) =>
              workspace.id === workspaceId
                ? { ...workspace, automaticDeliveryGroupingEnabled }
                : workspace,
            ),
          },
        });
        return workspaceId;
      }, enabled);
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
      await expect(page.getByTestId('orbit-view')).toBeVisible();
      const initialWrite = statSync(settingsPath, { bigint: true }).mtimeNs;
      const grouping = page.getByTestId(`workspace-automatic-delivery-grouping-${workspaceId}`);
      const saveLimit = page.getByTestId(`save-workspace-storage-limit-${workspaceId}`);
      const success = page.getByTestId('notification-success');
      const readGrouping = () =>
        page.evaluate(async (id) => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          const settings = await api.request('settings.get', {});
          return settings.workspaces.find((workspace) => workspace.id === id)
            ?.automaticDeliveryGroupingEnabled;
        }, workspaceId);

      // act
      await page.getByTestId('global-workspace-filter').click();
      await page.getByTestId('workspace-menu-settings').click();
      await page.getByTestId(`open-workspace-settings-${workspaceId}`).click();
      await page.getByTestId('workspace-settings-section-administration').click();

      // assert
      await expect(grouping).toHaveJSProperty('isChecked', enabled);
      await expect(saveLimit).toBeEnabled();
      await expect(success).toHaveCount(0);
      expect(statSync(settingsPath, { bigint: true }).mtimeNs).toBe(initialWrite);
      expect(await readGrouping()).toBe(enabled);

      await page.getByTestId('workspace-settings-section-services').click();
      await page.getByTestId('workspace-settings-section-administration').click();
      await expect(grouping).toHaveJSProperty('isChecked', enabled);
      await expect(saveLimit).toBeEnabled();
      await expect(success).toHaveCount(0);
      expect(statSync(settingsPath, { bigint: true }).mtimeNs).toBe(initialWrite);
      await page.screenshot({
        path: resolve(outputDirectory, `workspace-administration-${enabled}.png`),
        fullPage: true,
        animations: 'disabled',
      });

      await grouping.click();
      await expect.poll(readGrouping).toBe(!enabled);
      await expect(success).toHaveCount(1);
      await expect(success).toContainText('Settings saved');
      await page.screenshot({
        path: resolve(outputDirectory, `workspace-administration-saved-${enabled}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await expect(saveLimit).toBeEnabled();
      const changedWrite = statSync(settingsPath, { bigint: true }).mtimeNs;
      expect(changedWrite).not.toBe(initialWrite);
      await page.keyboard.press('Escape');
      await expect(success).toHaveCount(0);

      await page.getByTestId('workspace-settings-section-services').click();
      await page.getByTestId('workspace-settings-section-administration').click();
      await expect(grouping).toHaveJSProperty('isChecked', !enabled);
      await expect(saveLimit).toBeEnabled();
      await expect(success).toHaveCount(0);
      expect(statSync(settingsPath, { bigint: true }).mtimeNs).toBe(changedWrite);

      await grouping.press('Space');
      await expect.poll(readGrouping).toBe(enabled);
      await expect(success).toHaveCount(1);
      await expect(success).toContainText('Settings saved');
      expect(rendererErrors).toEqual([]);
    } finally {
      await app.close();
      rmSync(configurationRoot, { force: true, recursive: true });
    }
  });
}
