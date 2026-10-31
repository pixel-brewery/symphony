// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();
    await page.getByTestId('open-workspace-settings-personal').click();
    await expect(page.getByTestId('workspace-card-personal')).toBeVisible();
    // The Claude account is connected once under Connected services …
    await page.getByTestId('workspace-settings-section-services').click();
    await page.getByTestId('add-ai-runtime-account-claude-personal').click();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Connect AI account');
    await expect(page.getByTestId('ai-account-status')).toBeVisible();
    await expect(page.getByTestId('ai-account-status')).toContainText(
      /Not connected yet|CLI is not installed/,
    );
    await expect(page.getByTestId('save-settings-editor')).toHaveCount(0);
    await page.getByTestId('ai-account-name').locator('input').fill('Customer Claude account');
    // Abandoning the sign-in must not leave a half-connected account behind.
    await page.getByTestId('connect-ai-account').click();
    await expect(page.getByTestId('ai-authorization-code')).toBeVisible();
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(
      page
        .getByTestId('configured-accounts-personal')
        .locator('mosaik-cell[test-id^="configured-account-claude-"]'),
    ).toHaveCount(0);
    // Completing it does.
    const connectClaudeAccount = async () => {
      await page.getByTestId('add-ai-runtime-account-claude-personal').click();
      await page.getByTestId('ai-account-name').locator('input').fill('Customer Claude account');
      await page.getByTestId('connect-ai-account').click();
      await page
        .getByTestId('ai-authorization-code')
        .locator('input')
        .fill('e2e-authorization-code');
      await page.getByTestId('complete-claude-login').click();
      await expect(page.getByTestId('remove-ai-account')).toBeVisible();
      await page.getByTestId('cancel-settings-editor').click();
      await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    };
    await connectClaudeAccount();

    // An unused account can be removed straight from the Connected services row.
    const claudeRow = page
      .getByTestId('configured-accounts-personal')
      .locator('mosaik-cell[test-id^="configured-account-claude-"]');
    await expect(claudeRow).toHaveCount(1);
    await claudeRow.locator('[test-id^="remove-account-"]').click();
    const removal = page.locator('mosaik-message-box').last();
    await expect(removal).toContainText('Remove Customer Claude account?');
    await removal.getByText('Remove account', { exact: true }).click();
    await expect(claudeRow).toHaveCount(0);
    await connectClaudeAccount();
    const accountCell = page
      .getByTestId('configured-accounts-personal')
      .locator('mosaik-cell[test-id^="configured-account-claude-"]');
    await expect(accountCell).toContainText('Customer Claude account');
    await expect(accountCell).toContainText(/Not signed in|CLI not installed|Sign-in not checked/);
    await accountCell.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Edit AI account');
    await expect(page.getByTestId('ai-account-status')).toContainText(
      /Not signed in|CLI is not installed|Sign-in status has not been checked yet/,
    );
    await expect(page.getByTestId('connect-ai-account')).toBeVisible();
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // … and the agent only picks it.
    await page.getByTestId('workspace-settings-section-team').click();
    await page.getByTestId('add-ai-account-personal').click();
    await page
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-claude-"]')
      .click();
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await page.getByTestId('agent-ai-next').click();
    await page.getByTestId('ai-display-name').locator('input').fill('Customer Claude');
    await page.getByTestId('ai-position-name').locator('input').fill('Architecture Agent');
    await page
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Plans implementation-ready solutions.');
    await page.getByTestId('agent-identity-next').click();
    await page.getByTestId('ai-role-analysis').click();
    await page.getByTestId('agent-responsibilities-next').click();
    await page.getByTestId('save-settings-editor').click();

    const agentGroup = page.getByTestId('workspace-agents-personal');
    const agent = agentGroup
      .locator('mosaik-cell[test-id^="workspace-agent-"]')
      .filter({ hasText: 'Customer Claude' });
    await expect(agent).toHaveCount(1);
    // The row states which AI runs the agent as a second avatar.
    await expect(agent.locator('[test-id^="agent-provider-"]')).toHaveAttribute(
      'aria-label',
      'Claude',
    );
    await agent.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByTestId('ai-account')).toBeVisible();

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
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);

    await page.getByTestId('add-ai-account-personal').click();
    await page.getByTestId(`ai-account-${persisted!.id}`).click();
    await expect(page.getByTestId('agent-wizard')).toContainText('Claude');
    await page.getByTestId('agent-ai-next').click();
    await page.getByTestId('ai-display-name').locator('input').fill('Second Claude agent');
    await page.getByTestId('ai-position-name').locator('input').fill('Review Agent');
    await page
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Reviews implementation decisions.');
    await page.getByTestId('agent-identity-next').click();
    await page.getByTestId('ai-role-ci-diagnosis').click();
    await page.getByTestId('agent-responsibilities-next').click();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
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
