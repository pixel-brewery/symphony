// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expect,
  test,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
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
    // Symphony opens on Overview; Orbit is a Delivery entry in the sidebar.
    await page.getByTestId('navigation-orbit').click();
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
    await expect(page.getByTestId('orbit-object-details')).toContainText('Delivery destinations');
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
    // Escape returns the inspector from the destination to the default stage cluster.
    await expect(page.getByTestId('orbit-object-details')).toHaveCount(0);
    await expect(page.getByTestId('orbit-inspector')).toBeVisible();
    expect(await canvas.boundingBox()).toEqual(viewportBefore);
    expect(await readCamera()).toBe(cameraBefore);
    await page.getByTestId('orbit-label-production').click();
    await page.getByTestId('orbit-configure-destination').click();
    // Configuring a destination opens the separate Settings window on its destination sheet.
    const settingsWindow = await settingsWindowOf(app);
    settingsWindow.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(settingsWindow.getByTestId('delivery-target-editor')).toBeVisible();
    await expect(settingsWindow.getByTestId('workspace-delivery-destinations')).toBeVisible();
    await expect(settingsWindow.getByTestId('delivery-settings-repository')).toHaveJSProperty(
      'value',
      'delivery-project',
    );
    await expect(settingsWindow.getByTestId('delivery-target-orbit-preview')).toBeVisible();
    await expect(settingsWindow.getByTestId('delivery-target-orbit-preview')).toContainText(
      'Orbit preview · delivery-project',
    );
    await expect(settingsWindow.getByTestId('delivery-target-name').locator('input')).toHaveValue(
      'Production',
    );
    await expect(
      settingsWindow.getByTestId('delivery-target-environment').locator('input'),
    ).toHaveValue('production');
    await expect(settingsWindow.getByTestId('delivery-target-production')).toHaveJSProperty(
      'isChecked',
      true,
    );
    expect(await readTargets()).toHaveLength(1);
    await settingsWindow
      .getByTestId('delivery-target-name')
      .locator('input')
      .fill('Cancelled configuration');
    await settingsWindow.getByTestId('cancel-settings-editor').click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toHaveCount(0);
    expect(await readTargets()).toHaveLength(1);

    await page.getByTestId('navigation-orbit').click();
    await page.getByTestId('orbit-label-production').click();
    await page.getByTestId('orbit-configure-destination').click();
    await expect(settingsWindow.getByTestId('delivery-target-name').locator('input')).toHaveValue(
      'Production',
    );
    await settingsWindow.getByTestId('delivery-target-name').locator('input').fill('');
    await expect(settingsWindow.getByTestId('save-settings-editor')).toHaveJSProperty(
      'disabled',
      true,
    );
    await settingsWindow.getByTestId('delivery-target-name').locator('input').fill('Live Europe');
    await settingsWindow
      .getByTestId('delivery-target-environment')
      .locator('input')
      .fill('prod-eu');
    await settingsWindow.getByTestId('delivery-body-mars').click();
    await expect(
      settingsWindow.getByTestId('delivery-target-orbit-preview-body-mars'),
    ).toBeVisible();
    await settingsWindow.screenshot({
      path: resolve(outputDirectory, 'orbit-production-settings.png'),
      animations: 'disabled',
    });
    await settingsWindow.getByTestId('save-settings-editor').click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const target = (await readTargets()).find(
      (item) => item.repositoryBindingId === 'delivery-project',
    )!;
    expect(target).toMatchObject({
      displayName: 'Live Europe',
      environment: 'prod-eu',
      production: true,
      celestialBody: 'mars',
      workspaceId: 'personal',
      kind: 'environment',
    });
    expect((await readTargets()).find((item) => item.id === 'other-production')?.displayName).toBe(
      'Other production',
    );
    await expect(settingsWindow.getByTestId(`delivery-settings-target-${target.id}`)).toContainText(
      'Environment · prod-eu · Production',
    );
    await expect(settingsWindow.getByTestId('delivery-settings-repository')).toHaveJSProperty(
      'value',
      'delivery-project',
    );
    await settingsWindow.screenshot({
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
    await expect(settingsWindow.getByTestId('delivery-target-name').locator('input')).toHaveValue(
      'Live Europe',
    );
    await settingsWindow.getByTestId('delivery-target-name').locator('input').fill('Live cluster');
    await settingsWindow.getByTestId('save-settings-editor').click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toHaveCount(0);
    expect(
      (await readTargets()).filter((item) => item.repositoryBindingId === 'delivery-project'),
    ).toEqual([{ ...target, displayName: 'Live cluster' }]);

    await settingsWindow.getByTestId('add-delivery-target').click();
    await expect(settingsWindow.getByTestId('delivery-target-orbit-preview')).toHaveCount(0);
    await settingsWindow.getByTestId('delivery-target-name').locator('input').fill('Duplicate');
    await settingsWindow
      .getByTestId('delivery-target-environment')
      .locator('input')
      .fill('prod-eu');
    await expect(settingsWindow.getByTestId('delivery-target-duplicate')).toBeVisible();
    await expect(settingsWindow.getByTestId('save-settings-editor')).toHaveJSProperty(
      'disabled',
      true,
    );
    await settingsWindow.getByTestId('cancel-settings-editor').click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await settingsWindow.getByTestId(`remove-delivery-target-${target.id}`).click();
    await expect(
      settingsWindow.getByTestId(`settings-alert-remove-delivery-target-${target.id}`),
    ).toBeVisible();
    await settingsWindow.keyboard.press('Escape');
    await expect(
      settingsWindow.getByTestId(`settings-alert-remove-delivery-target-${target.id}`),
    ).toHaveCount(0);
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

/**
 * Returns the separate Settings window once a main-window action has opened it.
 *
 * @param app - The launched application.
 * @returns The Settings window.
 */
async function settingsWindowOf(app: ElectronApplication): Promise<Page> {
  const isSettings = (candidate: Page): boolean => candidate.url().includes('#/settings');
  await expect.poll(() => app.windows().some(isSettings), { timeout: 30_000 }).toBe(true);
  const settingsWindow = app.windows().find(isSettings)!;
  await expect(settingsWindow.getByTestId('settings-window')).toBeVisible();
  return settingsWindow;
}
