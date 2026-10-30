// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
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
    await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
      'data-celestial-body',
      'sun',
    );
    const readBody = () =>
      page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return (await api.request('settings.get', {})).deliveryTargets[0]?.celestialBody;
      });
    const edit = async () => {
      await page.getByTestId('orbit-label-production').click();
      await page.getByTestId('orbit-configure-destination').click();
      await expect(page.getByTestId('delivery-target-editor')).toBeVisible();
    };

    // act
    await edit();
    await expect(page.getByTestId('delivery-target-celestial-body')).toHaveJSProperty(
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
      await expect(page.getByTestId(`delivery-body-preview-${body}`)).toHaveJSProperty(
        'naturalWidth',
        384,
      );
      await expect(page.getByTestId(`delivery-body-preview-${body}`)).toHaveJSProperty(
        'naturalHeight',
        256,
      );
    }
    await expect(page.getByTestId('delivery-body-sun')).toHaveJSProperty('isChecked', true);
    await page.getByTestId('delivery-body-preview-mars').click();
    await expect(page.getByTestId('delivery-body-mars')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('delivery-body-sun')).toHaveJSProperty('isChecked', false);
    await page.getByTestId('cancel-settings-editor').click();
    // assert: a draft does not persist or alter the legacy default.
    expect(await readBody()).toBeUndefined();
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
      await edit();
      if (body === 'earth') {
        await page.getByTestId('delivery-body-earth').focus();
        await page.keyboard.press('Space');
      } else {
        await page.getByTestId(`delivery-body-${body}`).click();
      }
      await expect(page.getByTestId(`delivery-body-${body}`)).toHaveJSProperty('isChecked', true);
      await expect(page.getByTestId('delivery-target-celestial-body')).toHaveJSProperty(
        'value',
        body,
      );
      if (body === 'earth' || body === 'saturn') {
        await page.screenshot({
          path: resolve(outputDirectory, `orbit-body-choices-${body}.png`),
          animations: 'disabled',
        });
      }
      await page.getByTestId('save-settings-editor').click();
      await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
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
    page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    // assert: actual disk persistence and packaged local maps survive a full process restart.
    expect(await readBody()).toBe('saturn');
    await expect(page.getByTestId('orbit-label-production')).toHaveAttribute(
      'data-celestial-body',
      'saturn',
    );
    await expect(page.getByTestId('orbit-canvas')).toHaveAttribute('data-asset-state', 'ready');
    await edit();
    await expect(page.getByTestId('delivery-target-celestial-body')).toHaveJSProperty(
      'value',
      'saturn',
    );
    await expect(page.getByTestId('delivery-body-saturn')).toHaveJSProperty('isChecked', true);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});
