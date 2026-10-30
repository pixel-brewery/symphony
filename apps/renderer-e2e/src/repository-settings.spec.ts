// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await page.getByTestId('workspace-settings-section-repositories').click();

    await expect(page.getByTestId('add-repository-personal')).toBeVisible();
    await expect(page.getByText('Plan and run tests', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Allow AI tasks', { exact: true })).toHaveCount(0);

    await addRepository(page, 'FLAMOX365 Web', 'ruederennes', 'web-app');
    await addRepository(page, 'FLAMOX365 API', 'ruederennes', 'platform-api');

    const repositoryGroup = page.getByTestId('workspace-repositories-personal');
    await expect(repositoryGroup.locator('[test-id^="local-repository-"]')).toHaveCount(2);
    await expect(repositoryGroup).toContainText('FLAMOX365 Web');
    await expect(repositoryGroup).toContainText('FLAMOX365 API');
    await expect(page.getByTestId('add-repository-personal')).toBeVisible();
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
    await page.screenshot({
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
  page: Page,
  displayName: string,
  owner: string,
  name: string,
): Promise<void> {
  await page.getByTestId('add-repository-personal').click();
  await page.getByTestId('repository-display-name').locator('input').fill(displayName);
  await page.getByTestId('repository-owner').locator('input').fill(owner);
  await page.getByTestId('repository-name').locator('input').fill(name);
  await page.getByTestId('save-settings-editor').click();
  await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
}
