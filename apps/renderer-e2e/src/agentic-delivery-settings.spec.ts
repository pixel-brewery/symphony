// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

interface IAgenticDeliverySettingsApi {
  request(
    method: 'settings.get',
    payload: Record<string, never>,
  ): Promise<{
    runtime: {
      agenticDelivery: Record<string, boolean | number>;
    };
  }>;
}

const LADDER = [
  'agentic-delivery-enabled',
  'agentic-observe-failures',
  'agentic-ai-diagnosis',
  'agentic-ci-rerun',
  'agentic-managed-branch-updates',
  'agentic-source-repair',
  'agentic-workflow-repair',
  'agentic-replacement-pr',
] as const;

test('keeps agentic delivery off until a level is chosen and enforces the switch dependencies', async () => {
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
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await settings.getByTestId('global-settings-section-automation').click();

    const group = settings.getByTestId('agentic-delivery-settings-group');
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    for (const testId of [...LADDER, 'agentic-conflict-serialization', 'agentic-review-feedback']) {
      await expect(settings.getByTestId(testId)).toHaveJSProperty('isChecked', false);
    }
    await expect(settings.getByTestId('agentic-level-off')).toHaveJSProperty('isChecked', true);
    // A switch whose prerequisite is off is disabled and names that prerequisite.
    await expect(settings.getByTestId('agentic-observe-failures')).toHaveJSProperty(
      'disabled',
      true,
    );
    await expect(settings.getByTestId('agentic-observe-failures-needs')).toContainText(
      'Needs “Enable agentic delivery”',
    );
    await expect(settings.getByTestId('save-runtime-settings')).toHaveCount(0);

    const storedPolicy = () =>
      settings.evaluate(async () => {
        const api = (window as unknown as { orchestration: IAgenticDeliverySettingsApi })
          .orchestration;
        return (await api.request('settings.get', {})).runtime.agenticDelivery;
      });

    // Choosing a level sets its switches in one go and applies at once.
    await settings.getByTestId('agentic-level-diagnose').click();
    await expect.poll(storedPolicy).toMatchObject({
      enabled: true,
      observeFailures: true,
      aiDiagnosisEnabled: true,
      ciRerunEnabled: true,
      managedBranchUpdatesEnabled: false,
      sourceRepairEnabled: false,
      workflowRepairEnabled: false,
      replacementPullRequestEnabled: false,
    });
    await expect(settings.getByTestId('agentic-source-repair')).toHaveJSProperty('disabled', true);
    await expect(settings.getByTestId('agentic-source-repair-needs')).toContainText(
      'Needs “Update managed pull-request branches”',
    );
    await expect(settings.getByTestId('agentic-replacement-pr-needs')).toContainText(
      'Needs “Repair source failures”',
    );

    // Switching one switch reads Custom.
    await settings.getByTestId('agentic-ci-rerun').click();
    await expect(settings.getByTestId('agentic-level-custom')).toHaveJSProperty('isChecked', true);
    await expect.poll(storedPolicy).toMatchObject({ ciRerunEnabled: false });

    await settings.getByTestId('agentic-level-full').click();
    await expect.poll(storedPolicy).toMatchObject({
      managedBranchUpdatesEnabled: true,
      sourceRepairEnabled: true,
      workflowRepairEnabled: true,
      replacementPullRequestEnabled: true,
      ciRerunEnabled: true,
    });
    await expect(settings.getByTestId('agentic-replacement-pr')).toHaveJSProperty(
      'disabled',
      false,
    );
    await settings.screenshot({
      path: resolve(outputDirectory, 'agentic-delivery-settings.png'),
      fullPage: true,
    });

    await settings.getByTestId('agentic-level-off').click();
    await expect.poll(storedPolicy).toMatchObject({
      enabled: false,
      observeFailures: false,
      replacementPullRequestEnabled: false,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
