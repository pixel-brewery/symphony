// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('keeps repository setup scripts empty until edited and preserves saved commands', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `local-ci-setup-script-${process.pid}`);
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
    const workspaceId = await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const workspaceId = settings.workspaces[0]!.id;
      const connection = {
        id: 'setup-script-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Setup scripts',
        hostname: 'github.com',
        accountLogin: 'example-admin',
        gitProtocol: 'https' as const,
      };
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [...settings.connections, connection],
          repositoryBindings: ['', 'printf "ready\\n"\nnode --version', 'en'].map(
            (script, index) => ({
              id: `setup-script-${index}`,
              workspaceId,
              sourceControlConnectionId: connection.id,
              displayName: `symphony-e2e/setup-script-${index}`,
              provider: 'github' as const,
              host: 'github.com',
              owner: 'symphony-e2e',
              name: `setup-script-${index}`,
              defaultBranch: 'main',
              localPath,
              enabled: true,
              ...(script ? { localCiSetupScript: script } : {}),
            }),
          ),
        },
      });
      return workspaceId;
    }, resolve('.'));
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
    await expect(page.getByTestId('navigation-settings')).toBeVisible();

    // act
    const settings = await openSettings(page);
    await settings.getByTestId(`workspace-navigation-item-${workspaceId}`).click();
    await settings.getByTestId('workspace-settings-section-local-ci').click();
    const emptyScript = settings.getByTestId('local-ci-setup-script-setup-script-0');
    const scriptEditor = emptyScript.getByRole('textbox');

    // assert
    await expect(emptyScript).toBeVisible();
    await emptyScript.scrollIntoViewIfNeeded();
    await settings.screenshot({
      path: resolve(outputDirectory, 'local-ci-setup-script-before-focus.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await expect(scriptEditor).toHaveValue('');
    await expect(
      settings.getByTestId('local-ci-setup-script-setup-script-1').getByRole('textbox'),
    ).toHaveValue('printf "ready\\n"\nnode --version');
    await expect(
      settings.getByTestId('local-ci-setup-script-setup-script-2').getByRole('textbox'),
    ).toHaveValue('en');
    await scriptEditor.focus();
    await expect(scriptEditor).toHaveValue('');

    // A setup script applies when its editor loses focus; there is no Save button.
    await expect(settings.getByTestId('save-workspace-local-ci')).toHaveCount(0);
    const command = '# Install the repository dependency\nsudo apt-get install -y libvips';
    await scriptEditor.fill(command);
    await scriptEditor.blur();
    const readScripts = () =>
      page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return (await api.request('settings.get', {})).repositoryBindings.map(
          (repository) => repository.localCiSetupScript,
        );
      });
    await expect.poll(readScripts).toEqual([command, 'printf "ready\\n"\nnode --version', 'en']);
    await expect(settings.getByTestId('notification-success').last()).toContainText(
      'Settings saved',
    );
    await settings.getByTestId('workspace-settings-section-services').click();
    await settings.getByTestId('workspace-settings-section-local-ci').click();
    await expect(scriptEditor).toHaveValue(command);

    await scriptEditor.fill('');
    await scriptEditor.blur();
    await expect.poll(readScripts).toEqual([undefined, 'printf "ready\\n"\nnode --version', 'en']);
    await settings.getByTestId('workspace-settings-section-services').click();
    await settings.getByTestId('workspace-settings-section-local-ci').click();
    await expect(scriptEditor).toHaveValue('');
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
