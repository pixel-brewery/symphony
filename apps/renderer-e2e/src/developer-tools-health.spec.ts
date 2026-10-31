// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('shows developer-tool health without treating the OpenCode app as a CLI', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `developer-tools-health-${process.pid}`);
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
      PATH: process.env['SYMPHONY_E2E_HOST_PATH'] ?? process.env['PATH'] ?? '',
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
    await page.getByTestId('global-settings-section-system').click();
    await expect(page.getByTestId('developer-tools-health-card')).toBeVisible();
    await expect(page.getByTestId('developer-tools-list')).toBeVisible();
    for (const tool of ['homebrew', 'git', 'github-cli', 'codex', 'claude', 'opencode']) {
      await expect(page.getByTestId(`developer-tool-${tool}`)).toBeVisible();
    }

    await page.getByTestId('refresh-developer-tools').click();
    await expect(page.getByTestId('developer-tools-list')).toBeVisible();
    const installOpenCode = page.getByTestId('install-developer-tool-opencode');
    if (await installOpenCode.isVisible()) {
      await installOpenCode.click();
      const confirmation = page.locator('mosaik-message-box').last();
      await expect(confirmation).toContainText('Install OpenCode CLI?');
      await expect(confirmation).toContainText('Install with Homebrew');
      await confirmation.getByText('Cancel', { exact: true }).click();
      await expect(confirmation).toHaveCount(0);

      const settings = await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        return api.request('settings.get', {});
      });
      const workspaceId = settings.workspaces[0]!.id;
      await page.getByTestId('global-settings-section-workspaces').click();
      await page.getByTestId(`open-workspace-settings-${workspaceId}`).click();
      await page.getByTestId('workspace-settings-section-services').click();
      await page.getByTestId(`add-ai-runtime-account-opencode-${workspaceId}`).click();
      await expect(page.getByTestId('ai-provider-opencode')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await expect(page.getByTestId('missing-ai-runtime-opencode')).toBeVisible();
      await expect(page.getByTestId('install-ai-runtime-opencode')).toBeVisible();
    }
    await page.screenshot({
      path: resolve(outputDirectory, 'developer-tools-health.png'),
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
