// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('keeps exhausted GitHub Actions usage in Settings and out of navigation', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(
    outputDirectory,
    `github-actions-usage-configuration-${process.pid}`,
  );
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const launchOptions = {
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
      SYMPHONY_SIMULATED_GITHUB_REMAINING_MINUTES: '0',
    },
  };
  // act
  let app = await electron.launch(launchOptions);

  // assert
  try {
    const configurationPage = await app.firstWindow();
    await expect(configurationPage.getByTestId('orbit-view')).toBeVisible();
    await configurationPage.getByTestId('navigation-home').click();
    await expect(configurationPage.getByTestId('home-view')).toBeVisible();

    await configurationPage.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      const workspaceId = current.workspaces[0]!.id;
      const connection = {
        id: 'github-usage-account',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Example GitHub',
        hostname: 'github.com',
        accountLogin: 'example-admin',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'github-usage-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'example/product',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'example',
        name: 'product',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      const ciBinding = {
        id: 'github-usage-ci',
        workspaceId,
        repositoryBindingId: repository.id,
        sourceControlConnectionId: connection.id,
        provider: 'github-actions' as const,
        displayName: 'Example Actions',
        enabled: true,
        agenticDeliveryEnabled: false,
      };
      await api.request('settings.save', {
        settings: {
          ...current,
          connections: [...current.connections, connection],
          repositoryBindings: [...current.repositoryBindings, repository],
          ciBindings: [...current.ciBindings, ciBinding],
        },
      });
    }, workspace);

    await app.close();
    app = await electron.launch(launchOptions);
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('toggle-rail').click();
    await page.getByTestId('rail-run-segment-actions').click();
    const refreshActions = page.getByTestId('refresh-rail-actions');
    await expect(refreshActions).toHaveJSProperty('disabled', false);
    await expect(page.getByTestId('workspace-github-actions-usage')).toHaveCount(0);
    await refreshActions.click();
    await expect(refreshActions).toHaveJSProperty('disabled', false);
    await expect(page.getByTestId('workspace-github-actions-usage')).toHaveCount(0);
    await page.screenshot({
      path: resolve(outputDirectory, 'github-actions-usage-navigation.png'),
      fullPage: true,
    });
    await page.getByTestId('toggle-rail').click();
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    // A GitHub connection that only carries a repository is managed with that repository under
    // Repositories, not as a separate connected service.
    await page.getByTestId('workspace-settings-section-repositories').click();
    await expect(page.getByTestId('workspace-card-personal')).toBeVisible();
    await page.getByTestId('edit-repository-github-usage-repository').click();
    await expect(page.getByTestId('settings-editor-drawer')).toBeVisible();
    await expect(page.getByTestId('github-actions-usage')).toContainText('0 minutes remaining');
    await expect(page.getByTestId('github-actions-usage-details')).toContainText(/3[.,]000/);
    await expect(page.getByTestId('github-actions-usage-progress')).toBeVisible();
    await page.screenshot({
      path: resolve(outputDirectory, 'github-actions-usage-settings.png'),
      fullPage: true,
    });
    await expect(page.getByTestId('navigation-actions')).toBeVisible();

    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
