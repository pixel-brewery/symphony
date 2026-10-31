// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { closeSettings } from './closeSettings';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('edits workspace icons and colors through a cancellable draft and keeps them after reload', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `workspace-appearance-${process.pid}`);
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
    const readWorkspace = () =>
      page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return (await api.request('settings.get', {})).workspaces[0]!;
      });
    const initial = await readWorkspace();
    const editWorkspace = async () => {
      await page.getByTestId(`workspace-navigation-item-${initial.id}`).click();
      await page.getByTestId('workspace-settings-section-administration').click();
      await page.getByTestId(`edit-workspace-${initial.id}`).click();
      await page.getByTestId('choose-workspace-icon').click();
      await expect(page.getByTestId('workspace-avatar-dialog')).toBeVisible();
    };
    const chooseMonogram = async () => {
      await page.getByTestId('workspace-avatar-kind-monogram').click();
      await page.getByTestId('workspace-avatar-monogram').locator('input').fill('fx');
      await page.getByTestId('workspace-avatar-color-f97316').click();
    };

    // act: dismissing the picker leaves the workspace draft untouched.
    await openSettings(page);
    await editWorkspace();
    await chooseMonogram();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('workspace-avatar-dialog')).toHaveCount(0);
    await expect(page.getByTestId('settings-editor-drawer')).toBeVisible();

    // assert
    expect((await readWorkspace()).avatar).toEqual(initial.avatar);
    expect((await readWorkspace()).color).toBe(initial.color);

    // act: confirming the picker still leaves persistence to the outer editor.
    await page.getByTestId('choose-workspace-icon').click();
    await chooseMonogram();
    await page.getByTestId('workspace-avatar-save').click();
    await expect(page.getByTestId('workspace-avatar-dialog')).toHaveCount(0);
    await page.getByTestId('cancel-settings-editor').click();

    // assert
    expect((await readWorkspace()).avatar).toEqual(initial.avatar);
    expect((await readWorkspace()).color).toBe(initial.color);

    // act: save the monogram and color, then inspect every workspace surface.
    await editWorkspace();
    await chooseMonogram();
    await page.screenshot({
      path: resolve(outputDirectory, 'workspace-appearance-monogram-picker.png'),
      animations: 'disabled',
    });
    await page.getByTestId('workspace-avatar-save').click();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // assert
    expect(await readWorkspace()).toMatchObject({
      avatar: { kind: 'monogram', value: 'FX' },
      color: '#F97316',
    });
    const sidebarAvatar = page.getByTestId(`workspace-settings-avatar-${initial.id}`);
    await expect
      .poll(() =>
        sidebarAvatar.evaluate(
          (element) =>
            (element as HTMLElement & { src?: string }).src?.startsWith('data:image/png;') ?? false,
        ),
      )
      .toBe(true);
    const source = await sidebarAvatar.evaluate(
      (element) => (element as HTMLElement & { src: string }).src,
    );
    const background = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(8, 8, 1, 1).data);
    }, source);
    expect(background).toEqual([254, 235, 222, 255]);
    await page.getByTestId('global-settings-section-workspaces').click();
    await expect(page.getByTestId(`workspace-directory-avatar-${initial.id}`)).toHaveJSProperty(
      'src',
      source,
    );
    await closeSettings(page);
    await expect(page.getByTestId('workspace-switcher-avatar')).toHaveJSProperty('src', source);
    await page.getByTestId('global-workspace-filter').click();
    await expect(
      page.getByTestId(`global-workspace-filter-${initial.id}`).locator('mosaik-avatar'),
    ).toHaveJSProperty('src', source);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('notification-success')).toBeHidden();
    await page.screenshot({
      path: resolve(outputDirectory, 'workspace-appearance-navigation.png'),
      animations: 'disabled',
    });

    // act: reload the real Electron renderer and restore the stored appearance.
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      app.evaluate(({ BrowserWindow }, url) => {
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === url)
          ?.reload();
      }, page.url()),
    ]);

    // assert
    await expect(page.getByTestId('workspace-switcher-avatar')).toHaveJSProperty('src', source);
    expect((await readWorkspace()).avatar).toEqual({ kind: 'monogram', value: 'FX' });

    // act: select a registered icon through search.
    await openSettings(page);
    await editWorkspace();
    await page.getByTestId('workspace-avatar-kind-icon').click();
    await page.getByTestId('workspace-avatar-search').locator('input').fill('folder');
    await page.getByTestId('workspace-avatar-icon-folder').click();
    await page.getByTestId('workspace-avatar-save').click();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // assert
    expect((await readWorkspace()).avatar).toEqual({ kind: 'icon', value: 'folder' });

    // act: paste a joined emoji, then save it through the same writer.
    await editWorkspace();
    await page.getByTestId('workspace-avatar-kind-emoji').click();
    await page.getByTestId('workspace-avatar-emoji').locator('input').fill('👩🏽‍💻');
    await page.getByTestId('workspace-avatar-save').click();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // assert
    expect((await readWorkspace()).avatar).toEqual({ kind: 'emoji', value: '👩🏽‍💻' });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
