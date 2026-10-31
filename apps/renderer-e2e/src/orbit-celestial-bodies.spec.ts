// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { closeSettings } from './closeSettings';
import { expectSettingsInMainWindow } from './expectSettingsInMainWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('selects every Solar System body for Production, loads local maps, and preserves it after restart', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const root = resolve(outputDirectory, `orbit-celestial-bodies-${process.pid}`);
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
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
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
              id: 'planet-github',
              workspaceId: 'personal',
              kind: 'github',
              displayName: 'Fixture GitHub',
              hostname: 'github.com',
              gitProtocol: 'https',
            },
          ],
          repositoryBindings: [
            {
              id: 'planet-project',
              workspaceId: 'personal',
              sourceControlConnectionId: 'planet-github',
              provider: 'simulated',
              displayName: 'Planet project',
              host: 'github.com',
              owner: 'fixture',
              name: 'planet-project',
              defaultBranch: 'main',
              localPath: '',
              enabled: true,
            },
          ],
          deliveryTargets: [
            {
              id: 'planet-production',
              workspaceId: 'personal',
              repositoryBindingId: 'planet-project',
              displayName: 'Production',
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
    await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
      'data-celestial-body',
      'sun',
    );
    const readBody = () =>
      page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return (await api.request('settings.get', {})).deliveryTargets[0]?.celestialBody;
      });
    // Configuring the destination opens its sheet in Settings inside the main window.
    const edit = async (): Promise<Page> => {
      await page.getByTestId('orbit-label-production').click();
      await page.getByTestId('orbit-configure-destination').click();
      await expectSettingsInMainWindow(app, page);
      await expect(page.getByTestId('delivery-target-editor')).toBeVisible();
      return page;
    };

    // act
    let sheet = await edit();
    await expect(sheet.getByTestId('delivery-target-celestial-body')).toHaveJSProperty(
      'value',
      'sun',
    );
    for (const body of [
      'sun',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]) {
      // assert: every choice includes a real, locally loaded transparent body portrait.
      await expect(sheet.getByTestId(`delivery-body-preview-${body}`)).toHaveJSProperty(
        'naturalWidth',
        384,
      );
      await expect(sheet.getByTestId(`delivery-body-preview-${body}`)).toHaveJSProperty(
        'naturalHeight',
        256,
      );
    }
    await expect(sheet.getByTestId('delivery-body-sun')).toHaveJSProperty('isChecked', true);
    await sheet.getByTestId('delivery-body-preview-mars').click();
    await expect(sheet.getByTestId('delivery-body-mars')).toHaveJSProperty('isChecked', true);
    await expect(sheet.getByTestId('delivery-body-sun')).toHaveJSProperty('isChecked', false);
    await expect(sheet.getByTestId('delivery-target-orbit-preview-body-mars')).toBeVisible();
    await sheet.getByTestId('cancel-settings-editor').click();
    await expect(sheet.getByTestId('settings-editor-drawer')).toHaveCount(0);
    // assert: a draft does not persist or alter the legacy default.
    expect(await readBody()).toBeUndefined();
    await closeSettings(page);
    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
      'data-celestial-body',
      'sun',
    );

    for (const body of [
      'earth',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'uranus',
      'neptune',
      'sun',
      'saturn',
    ]) {
      // act
      sheet = await edit();
      if (body === 'earth') {
        await sheet.getByTestId('delivery-body-earth').focus();
        await sheet.keyboard.press('Space');
      } else {
        await sheet.getByTestId(`delivery-body-${body}`).click();
      }
      await expect(sheet.getByTestId(`delivery-body-${body}`)).toHaveJSProperty('isChecked', true);
      await expect(sheet.getByTestId('delivery-target-celestial-body')).toHaveJSProperty(
        'value',
        body,
      );
      if (body === 'earth' || body === 'saturn') {
        await sheet.screenshot({
          path: resolve(outputDirectory, `orbit-body-choices-${body}.png`),
          animations: 'disabled',
        });
      }
      await sheet.getByTestId('save-settings-editor').click();
      await expect(sheet.getByTestId('settings-editor-drawer')).toHaveCount(0);
      await closeSettings(page);
      await page.getByTestId('navigation-orbit').click();
      await page.getByTestId('landscape-fit').click();
      await expect(page.getByTestId('orbit-canvas')).toHaveAttribute('data-render-state', 'ready');
      await expect(page.getByTestId('orbit-canvas')).toHaveAttribute('data-asset-state', 'ready');
      // assert
      expect(await readBody()).toBe(body);
      await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
        'data-celestial-body',
        body,
      );
      await page.getByTestId('orbit-label-production').click();
      await expect(page.getByTestId('delivery-target-unconfirmed')).toBeVisible();
      await expect(page.getByTestId('delivery-target-confirmed')).toHaveCount(0);
      await page.getByTestId('orbit-close-delivery-target-details').click();
      await page.getByTestId('landscape-fit').focus();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('notification-success')).toHaveCount(0);
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      await page.screenshot({
        path: resolve(outputDirectory, `orbit-body-${body}-light.png`),
        animations: 'disabled',
      });
    }
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.getByTestId('orbit-canvas')).toHaveAttribute('data-asset-state', 'ready');
    await page.screenshot({
      path: resolve(outputDirectory, 'orbit-body-saturn-dark.png'),
      animations: 'disabled',
    });
    await app.close();
    app = await electron.launch(launchOptions);
    // The restarted window reopens Orbit, the screen it showed last.
    page = await prepareMainWindow(app, 'orbit-view');
    page.on('pageerror', (error) => errors.push(error.message));
    // assert: actual disk persistence and packaged local maps survive a full process restart.
    expect(await readBody()).toBe('saturn');
    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
      'data-celestial-body',
      'saturn',
    );
    await expect(page.getByTestId('orbit-canvas')).toHaveAttribute('data-asset-state', 'ready');
    sheet = await edit();
    await expect(sheet.getByTestId('delivery-target-celestial-body')).toHaveJSProperty(
      'value',
      'saturn',
    );
    await expect(sheet.getByTestId('delivery-body-saturn')).toHaveJSProperty('isChecked', true);
    await expect(sheet.getByTestId('delivery-target-orbit-preview-body-saturn')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});
