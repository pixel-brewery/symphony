// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('keeps a Claude sign-in owned by its workspace account', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `workspace-ai-isolation-${process.pid}`);
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
    await expect(page.getByTestId('navigation-settings')).toBeVisible();
    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await settings.getByTestId('workspace-navigation-item-personal').click();
    // The Claude account is connected once under Connected services …
    await settings.getByTestId('workspace-settings-section-services').click();
    await expect(settings.getByTestId('workspace-card-personal')).toBeVisible();
    await settings.getByTestId('add-ai-runtime-account-claude-personal').click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText(
      'Connect AI account',
    );
    await expect(settings.getByTestId('ai-account-status')).toBeVisible();
    await expect(settings.getByTestId('ai-account-status')).toContainText(
      /Not connected yet|CLI is not installed/,
    );
    await expect(settings.getByTestId('save-settings-editor')).toHaveCount(0);
    await settings.getByTestId('ai-account-name').locator('input').fill('Customer Claude account');
    // Abandoning the sign-in must not leave a half-connected account behind.
    await settings.getByTestId('connect-ai-account').click();
    await expect(settings.getByTestId('ai-authorization-code')).toBeVisible();
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(
      settings
        .getByTestId('configured-accounts-personal')
        .locator('[test-id^="configured-account-claude-"]'),
    ).toHaveCount(0);
    // Completing it does.
    const connectClaudeAccount = async () => {
      await settings.getByTestId('add-ai-runtime-account-claude-personal').click();
      await settings
        .getByTestId('ai-account-name')
        .locator('input')
        .fill('Customer Claude account');
      await settings.getByTestId('connect-ai-account').click();
      await settings
        .getByTestId('ai-authorization-code')
        .locator('input')
        .fill('e2e-authorization-code');
      await settings.getByTestId('complete-claude-login').click();
      await expect(settings.getByTestId('remove-ai-account')).toBeVisible();
      await settings.getByTestId('cancel-settings-editor').click();
      await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    };
    await connectClaudeAccount();

    // An unused account can be removed straight from the Connected services row.
    const claudeRow = settings
      .getByTestId('configured-accounts-personal')
      .locator('[test-id^="configured-account-claude-"]');
    await expect(claudeRow).toHaveCount(1);
    await claudeRow.locator('[test-id^="remove-account-"]').click();
    // Removing an account is confirmed in an alert sheet of the Settings window.
    const removal = settings.locator(
      '[test-id^="settings-alert-remove-ai-account-"]:not([test-id$="-confirm"]):not([test-id$="-cancel"])',
    );
    await expect(removal).toContainText('Remove Customer Claude account?');
    // The alert's buttons sit in the sheet's footer, beside its message.
    await settings
      .locator('[test-id^="settings-alert-remove-ai-account-"][test-id$="-confirm"]')
      .click();
    await expect(claudeRow).toHaveCount(0);
    await connectClaudeAccount();
    const accountCell = settings
      .getByTestId('configured-accounts-personal')
      .locator('[test-id^="configured-account-claude-"]');
    await expect(accountCell).toContainText('Customer Claude account');
    await expect(accountCell).toContainText(/Not signed in|CLI not installed|Sign-in not checked/);
    await accountCell.locator('[test-id^="edit-account-"]').click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText('Edit AI account');
    await expect(settings.getByTestId('ai-account-status')).toContainText(
      /Not signed in|CLI is not installed|Sign-in status has not been checked yet/,
    );
    await expect(settings.getByTestId('connect-ai-account')).toBeVisible();
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // … and the agent only picks it.
    await settings.getByTestId('workspace-settings-section-team').click();
    await settings.getByTestId('add-ai-account-personal').click();
    await settings
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-claude-"]')
      .click();
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await settings.getByTestId('ai-display-name').locator('input').fill('Customer Claude');
    await settings.getByTestId('ai-position-name').locator('input').fill('Architecture Agent');
    await settings
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Plans implementation-ready solutions.');
    await settings.getByTestId('ai-role-analysis').click();
    await settings.getByTestId('save-settings-editor').click();

    const agentGroup = settings.getByTestId('workspace-agents-personal');
    const agent = agentGroup
      .locator('[test-id^="workspace-agent-"]')
      .filter({ hasText: 'Customer Claude' });
    await expect(agent).toHaveCount(1);
    // The card states which AI account runs the agent.
    await expect(agent.locator('[test-id^="agent-provider-"]')).toHaveAttribute(
      'aria-label',
      'Claude',
    );
    await agent.locator('[test-id^="edit-agent-account-"]').click();
    await expect(settings.getByTestId('ai-account')).toBeVisible();

    const persisted = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const agent = settings.agentProfiles.find(
        (candidate) => candidate.displayName === 'Customer Claude',
      );
      const route = settings.agentRoutePolicies.find(
        (candidate) => candidate.id === agent?.routePolicyId,
      );
      return settings.connections.find(
        (candidate) => candidate.id === route?.candidates[0]?.aiConnectionId,
      );
    });
    expect(persisted).toMatchObject({
      workspaceId: 'personal',
      kind: 'claude',
      credentialSource: 'isolated',
    });
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(settings.locator('.cdk-overlay-backdrop')).toHaveCount(0);

    await settings.getByTestId('add-ai-account-personal').click();
    await settings.getByTestId(`ai-account-${persisted!.id}`).click();
    await expect(settings.getByTestId('agent-wizard')).toContainText('Claude');
    await settings.getByTestId('ai-display-name').locator('input').fill('Second Claude agent');
    await settings.getByTestId('ai-position-name').locator('input').fill('Review Agent');
    await settings
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Reviews implementation decisions.');
    await settings.getByTestId('ai-role-ci-diagnosis').click();
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(agentGroup.locator('[test-id^="workspace-agent-"]')).toHaveCount(3);

    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await expect(page.getByTestId('workspace-ai-banner')).toHaveCount(0);
    await expect(page.getByTestId('footer-workspace-picker')).toHaveCount(0);
    await page.screenshot({
      path: resolve(outputDirectory, 'settings-claude-workspace-account.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
