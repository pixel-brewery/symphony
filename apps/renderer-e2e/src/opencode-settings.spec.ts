// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { openSettings } from './openSettings';

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
    await expect(page.getByTestId('navigation-settings')).toBeVisible();
    const settings = await openSettings(page);
    await settings.getByTestId('workspace-navigation-item-personal').click();
    await settings.getByTestId('workspace-settings-section-services').click();
    await expect(settings.getByTestId('workspace-card-personal')).toBeVisible();
    await settings.getByTestId('add-ai-runtime-account-opencode-personal').click();
    await expect(settings.getByTestId('ai-provider-opencode')).toHaveJSProperty('isChecked', true);
    await settings.getByTestId('ai-account-name').locator('input').fill('OpenCode account');
    await settings.getByTestId('ai-account-advanced-settings').click();
    await settings.getByTestId('ai-credential-ref').locator('input').fill('env:OPENAI_API_KEY');
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const accountGroup = settings.getByTestId('configured-accounts-personal');
    await expect(accountGroup).toContainText('OpenCode account');
    await expect(accountGroup).toContainText('OpenCode');

    await settings.getByTestId('workspace-settings-section-team').click();
    await settings.getByTestId('add-ai-account-personal').click();
    await settings
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-opencode-"]')
      .click();
    await settings.getByTestId('ai-model-openai/gpt-5.6').click();
    await settings.getByTestId('ai-reasoning-high').click();
    // The agent sheet asks its four questions on one page; no step has to be advanced.
    await settings.getByTestId('ai-display-name').locator('input').fill('OpenCode agent');
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(settings.getByTestId('workspace-ai-banner')).toHaveCount(0);

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
    await settings.screenshot({
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
  const isMainWindow = (page: { url(): string }): boolean => !page.url().includes('#/menu-bar');
  const existing = app.windows().find(isMainWindow);
  return existing ?? (await app.waitForEvent('window', { predicate: isMainWindow }));
}
