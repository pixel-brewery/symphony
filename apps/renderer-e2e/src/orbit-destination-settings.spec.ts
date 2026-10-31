// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('configures Production from its overlay in the selected project without claiming a delivery', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const root = resolve(outputDirectory, `orbit-destination-settings-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(root, { recursive: true, force: true });
  const launchOptions = {
    args: ['.', `--user-data-dir=${resolve(root, 'electron')}`],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: root,
      SYMPHONY_DATABASE_PATH: resolve(root, 'state.sqlite'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  };
  let app = await electron.launch(launchOptions);
  try {
    let page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      await api.request('settings.save', {
        settings: {
          ...settings,
          user: { ...settings.user, theme: 'system' },
          connections: [
            ...settings.connections,
            {
              id: 'orbit-github',
              workspaceId: 'personal',
              kind: 'github',
              displayName: 'Fixture GitHub',
              hostname: 'github.com',
              gitProtocol: 'https',
            },
          ],
          repositoryBindings: ['other-project', 'delivery-project'].map((id) => ({
            id,
            workspaceId: 'personal',
            sourceControlConnectionId: 'orbit-github',
            provider: 'simulated',
            displayName: id,
            host: 'github.com',
            owner: 'fixture',
            name: id,
            defaultBranch: 'main',
            localPath: '',
            enabled: true,
          })),
          deliveryTargets: [
            {
              id: 'other-production',
              workspaceId: 'personal',
              repositoryBindingId: 'other-project',
              displayName: 'Other production',
              kind: 'environment',
              environment: 'production',
              production: true,
            },
          ],
        },
      });
    });
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      app.evaluate(
        ({ BrowserWindow }, url) =>
          BrowserWindow.getAllWindows()
            .find((window) => window.webContents.getURL() === url)
            ?.reload(),
        page.url(),
      ),
    ]);
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    const readTargets = () =>
      page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return (await api.request('settings.get', {})).deliveryTargets;
      });

    // act
    await page.getByTestId('orbit-repository').click();
    await page.getByTestId('orbit-repository-delivery-project').click();
    const canvas = page.getByTestId('orbit-canvas');
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    const viewportBefore = await canvas.boundingBox();
    const readCamera = () =>
      canvas.evaluate((element) =>
        ['x', 'y', 'z', 'target-x', 'target-y', 'target-z']
          .map((coordinate) => Number(element.getAttribute('data-camera-' + coordinate)).toFixed(5))
          .join(','),
      );
    const cameraBefore = await readCamera();
    await page.getByTestId('orbit-label-production').click();

    // assert
    await expect(page.getByTestId('orbit-production-unassigned')).toBeVisible();
    await expect(page.getByTestId('orbit-details')).toContainText('Delivery destinations');
    await expect(page.getByTestId('orbit-destination-project')).toHaveText('delivery-project');
    expect(await canvas.boundingBox()).toEqual(viewportBefore);
    expect(await readCamera()).toBe(cameraBefore);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.screenshot({
      path: resolve(outputDirectory, 'orbit-production-details-light.png'),
      animations: 'disabled',
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({
      path: resolve(outputDirectory, 'orbit-production-details-dark.png'),
      animations: 'disabled',
    });
    await page.getByTestId('orbit-close-object').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('orbit-details')).toHaveCount(0);
    expect(await canvas.boundingBox()).toEqual(viewportBefore);
    expect(await readCamera()).toBe(cameraBefore);
    await page.getByTestId('orbit-label-production').click();
    await page.getByTestId('orbit-configure-destination').click();
    await expect(page.getByTestId('delivery-target-editor')).toBeVisible();
    await expect(page.getByTestId('workspace-settings-section-delivery')).toHaveJSProperty(
      'isChecked',
      true,
    );
    await expect(page.getByTestId('delivery-settings-repository')).toHaveJSProperty(
      'value',
      'delivery-project',
    );
    await expect(page.getByTestId('delivery-target-name').locator('input')).toHaveValue(
      'Production',
    );
    await expect(page.getByTestId('delivery-target-environment').locator('input')).toHaveValue(
      'production',
    );
    await expect(page.getByTestId('delivery-target-production')).toHaveJSProperty(
      'isChecked',
      true,
    );
    expect(await readTargets()).toHaveLength(1);
    await page.getByTestId('delivery-target-name').locator('input').fill('Cancelled configuration');
    await page.getByTestId('cancel-settings-editor').click();
    expect(await readTargets()).toHaveLength(1);

    await page.getByTestId('navigation-orbit').click();
    await page.getByTestId('orbit-label-production').click();
    await page.getByTestId('orbit-configure-destination').click();
    await expect(page.getByTestId('delivery-target-name').locator('input')).toHaveValue(
      'Production',
    );
    await page.getByTestId('delivery-target-name').locator('input').fill('');
    await expect(page.getByTestId('save-settings-editor')).toHaveJSProperty('disabled', true);
    await page.getByTestId('delivery-target-name').locator('input').fill('Live Europe');
    await page.getByTestId('delivery-target-environment').locator('input').fill('prod-eu');
    await page.screenshot({
      path: resolve(outputDirectory, 'orbit-production-settings.png'),
      animations: 'disabled',
    });
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const target = (await readTargets()).find(
      (item) => item.repositoryBindingId === 'delivery-project',
    )!;
    expect(target).toMatchObject({
      displayName: 'Live Europe',
      environment: 'prod-eu',
      production: true,
      workspaceId: 'personal',
      kind: 'environment',
    });
    expect((await readTargets()).find((item) => item.id === 'other-production')?.displayName).toBe(
      'Other production',
    );
    // Wait for the editor backdrop to close through a normal actionable control.
    await page.getByTestId('delivery-settings-repository').click();
    await page.getByTestId('delivery-settings-repository-delivery-project').click();
    await page.getByTestId('add-delivery-target').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('notification-success')).toHaveCount(0);
    await expect(page.getByTestId('delivery-settings-repository')).toHaveJSProperty(
      'value',
      'delivery-project',
    );
    await page.screenshot({
      path: resolve(outputDirectory, 'orbit-delivery-destinations-settings.png'),
      animations: 'disabled',
    });
    await page.getByTestId('navigation-orbit').click();
    await page.getByTestId('orbit-label-production').click();
    await expect(page.getByTestId('delivery-target-details')).toBeVisible();
    await expect(page.getByTestId('orbit-destination-environment')).toContainText('prod-eu');
    await expect(page.getByTestId('delivery-target-unconfirmed')).toBeVisible();
    await expect(page.getByTestId('delivery-target-confirmed')).toHaveCount(0);
    await page.getByTestId('orbit-configure-destination').click();
    await expect(page.getByTestId('delivery-target-name').locator('input')).toHaveValue(
      'Live Europe',
    );
    await page.getByTestId('delivery-target-name').locator('input').fill('Live cluster');
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    expect(
      (await readTargets()).filter((item) => item.repositoryBindingId === 'delivery-project'),
    ).toEqual([{ ...target, displayName: 'Live cluster' }]);

    await page.getByTestId('add-delivery-target').click();
    await page.getByTestId('delivery-target-name').locator('input').fill('Duplicate');
    await page.getByTestId('delivery-target-environment').locator('input').fill('prod-eu');
    await expect(page.getByTestId('delivery-target-duplicate')).toBeVisible();
    await expect(page.getByTestId('save-settings-editor')).toHaveJSProperty('disabled', true);
    await page.getByTestId('cancel-settings-editor').click();
    await page.getByTestId(`remove-delivery-target-${target.id}`).click();
    await page.keyboard.press('Escape');
    expect((await readTargets()).some((item) => item.id === target.id)).toBe(true);

    // A full application restart reads the saved target from disk, with the same identity.
    await app.close();
    app = await electron.launch(launchOptions);
    page = await prepareMainWindow(app);
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    expect((await readTargets()).find((item) => item.id === target.id)?.displayName).toBe(
      'Live cluster',
    );
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});
