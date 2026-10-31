// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { openSettings } from './openSettings';

// #endregion

test('configures several repositories in one workspace without a second AI approval', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `repository-settings-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
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
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('navigation-settings')).toBeVisible();
    const settings = await openSettings(page);
    await settings.getByTestId('workspace-navigation-item-personal').click();
    await settings.getByTestId('workspace-settings-section-repositories').click();

    await expect(settings.getByTestId('add-repository-personal')).toBeVisible();
    await expect(settings.getByText('Plan and run tests', { exact: true })).toHaveCount(0);
    await expect(settings.getByText('Allow AI tasks', { exact: true })).toHaveCount(0);

    await addRepository(settings, 'FLAMOX365 Web', 'ruederennes', 'web-app');
    await addRepository(settings, 'FLAMOX365 API', 'ruederennes', 'platform-api');

    const repositoryGroup = settings.getByTestId('workspace-repositories-personal');
    await expect(repositoryGroup.locator('[test-id^="local-repository-"]')).toHaveCount(2);
    await expect(repositoryGroup).toContainText('FLAMOX365 Web');
    await expect(repositoryGroup).toContainText('FLAMOX365 API');
    await expect(settings.getByTestId('add-repository-personal')).toBeVisible();
    const configured = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      return {
        repositories: settings.repositoryBindings.filter(
          (repository) => repository.workspaceId === 'personal',
        ),
        githubConnections: settings.connections.filter(
          (connection) => connection.workspaceId === 'personal' && connection.kind === 'github',
        ),
      };
    });
    expect(configured.repositories.map((repository) => repository.displayName)).toEqual([
      'FLAMOX365 Web',
      'FLAMOX365 API',
    ]);
    expect(configured.repositories.every((repository) => repository.enabled)).toBe(true);
    expect(
      new Set(configured.repositories.map((repository) => repository.sourceControlConnectionId)),
    ).toHaveProperty('size', 1);
    expect(configured.githubConnections).toHaveLength(1);
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'settings-multi-repository.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
  }
});

async function addRepository(
  settings: Page,
  displayName: string,
  owner: string,
  name: string,
): Promise<void> {
  await settings.getByTestId('add-repository-personal').click();
  await settings.getByTestId('repository-display-name').locator('input').fill(displayName);
  await settings.getByTestId('repository-owner').locator('input').fill(owner);
  await settings.getByTestId('repository-name').locator('input').fill(name);
  await settings.getByTestId('save-settings-editor').click();
  await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
}
