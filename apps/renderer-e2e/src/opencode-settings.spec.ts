// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('adds and projects a workspace-owned OpenCode account', async () => {
  // arrange
  test.skip(
    true,
    'OpenCode opens an external interactive flow and cannot be exercised safely in desktop E2E.',
  );
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `opencode-settings-${process.pid}`);
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
    const page = await mainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await expect(page.getByTestId('workspace-card-personal')).toBeVisible();
    await page.getByTestId('workspace-settings-section-services').click();
    await page.getByTestId('add-ai-runtime-account-opencode-personal').click();
    await page.getByTestId('ai-account-name').locator('input').fill('OpenCode account');
    await page.getByTestId('ai-account-advanced-settings').click();
    await page.getByTestId('ai-credential-ref').locator('input').fill('env:OPENAI_API_KEY');
    await page.getByTestId('connect-ai-account').click();
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const accountGroup = page.getByTestId('configured-accounts-personal');
    await expect(accountGroup).toContainText('OpenCode account');
    await expect(accountGroup).toContainText('OpenCode');

    await page.getByTestId('workspace-settings-section-team').click();
    await page.getByTestId('add-ai-account-personal').click();
    await page
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-opencode-"]')
      .click();
    await page.getByTestId('ai-model-openai/gpt-5.6').click();
    await page.getByTestId('ai-reasoning-high').click();
    await page.getByTestId('agent-ai-next').click();
    await page.getByTestId('ai-display-name').locator('input').fill('OpenCode agent');
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(page.getByTestId('workspace-ai-banner')).toHaveCount(0);

    const persisted = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const connection = settings.connections.find((candidate) => candidate.kind === 'opencode');
      const routeCandidate = settings.agentRoutePolicies
        .flatMap((policy) => policy.candidates)
        .find((candidate) => candidate.aiConnectionId === connection?.id);
      return { connection, routeCandidate };
    });
    expect(persisted.connection).toMatchObject({
      kind: 'opencode',
      displayName: 'OpenCode account',
      credentialRef: 'env:OPENAI_API_KEY',
    });
    expect(persisted.routeCandidate).toMatchObject({
      model: 'openai/gpt-5.6',
      reasoningEffort: 'high',
    });
    await page.screenshot({
      path: resolve(outputDirectory, 'opencode-settings.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

async function mainWindow(app: ElectronApplication) {
  const existing = app.windows().find((page) => !page.url().includes('#/menu-bar'));
  return (
    existing ??
    (await app.waitForEvent('window', {
      predicate: (page) => !page.url().includes('#/menu-bar'),
    }))
  );
}
