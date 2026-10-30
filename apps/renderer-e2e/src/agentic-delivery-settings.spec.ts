// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';

// #endregion

interface IAgenticDeliverySettingsApi {
  request(
    method: 'settings.get',
    payload: Record<string, never>,
  ): Promise<{
    runtime: {
      agenticDelivery: {
        enabled: boolean;
        observeFailures: boolean;
      };
    };
  }>;
}

test('keeps agentic delivery disabled until the global policy is explicitly saved', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `agentic-delivery-${process.pid}`);
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
    await page.getByTestId('global-settings-section-automation').click();

    const group = page.getByTestId('agentic-delivery-settings-group');
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    for (const testId of [
      'agentic-delivery-enabled',
      'agentic-observe-failures',
      'agentic-ai-diagnosis',
      'agentic-source-repair',
      'agentic-workflow-repair',
      'agentic-managed-branch-updates',
      'agentic-ci-rerun',
      'agentic-replacement-pr',
      'agentic-conflict-serialization',
    ]) {
      await expect(page.getByTestId(testId)).toHaveJSProperty('isChecked', false);
    }

    await page.getByTestId('agentic-delivery-enabled').click();
    await page.getByTestId('agentic-observe-failures').click();
    await page.getByTestId('save-runtime-settings').click();
    await expect(page.getByTestId('notification-success').last()).toContainText('Settings saved');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IAgenticDeliverySettingsApi })
            .orchestration;
          return (await api.request('settings.get', {})).runtime.agenticDelivery;
        }),
      )
      .toMatchObject({ enabled: true, observeFailures: true });
    await page.screenshot({
      path: resolve(outputDirectory, 'agentic-delivery-settings.png'),
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
