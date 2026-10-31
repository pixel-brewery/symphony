// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('opens exactly one workspace organization and projects its delivery routing', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `workspace-organization-${process.pid}`);
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
    // Settings is its own window.
    const settings = await openSettingsWindow(app, page);
    settings.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));

    const stored = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return api.request('settings.get', {});
    });
    const workspaceId = stored.workspaces[0]!.id;
    const position = stored.positions.find((item) => item.workspaceId === workspaceId)!;
    const agent = stored.agentProfiles.find((item) => item.workspaceId === workspaceId)!;
    const route = stored.agentRoutePolicies.find((item) => item.workspaceId === workspaceId)!;
    const candidate = route.candidates[0]!;
    const provider = stored.providerManifests.find((item) => item.workspaceId === workspaceId)!;

    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await settings.getByTestId(`open-workspace-settings-${workspaceId}`).click();
    await expect(settings.getByTestId(`workspace-card-${workspaceId}`)).toBeVisible();
    // The delivery flow shows who does each step, in flow order, ending with a person.
    await expect(settings.getByTestId(`workspace-teams-${workspaceId}`)).toBeVisible();
    await expect(
      settings
        .getByTestId(`workspace-teams-${workspaceId}`)
        .locator('[test-id^="delivery-flow-step-"]'),
    ).toHaveCount(6);
    await expect(settings.getByTestId('delivery-flow-step-acceptance')).toContainText('You');
    // Technical AI setup is open as drawn.
    await settings.getByTestId(`workspace-ai-technical-${workspaceId}`).scrollIntoViewIfNeeded();
    await expect(settings.getByTestId(`workspace-position-${position.id}`)).toContainText(
      position.displayName,
    );
    await expect(settings.getByTestId(`workspace-agent-${agent.id}`)).toContainText(
      agent.displayName,
    );
    await expect(settings.getByTestId(`workspace-provider-${provider.id}`)).toContainText(
      provider.providerId,
    );
    await expect(settings.getByTestId(`workspace-route-${route.id}`)).toContainText(
      route.displayName,
    );
    await expect(settings.getByTestId(`workspace-route-candidate-${candidate.id}`)).toContainText(
      'Default Codex account',
    );

    // Connect an OpenCode account once under Connected services.
    await settings.getByTestId('workspace-settings-section-services').click();
    await settings.getByTestId(`add-ai-runtime-account-opencode-${workspaceId}`).click();
    await expect(settings.locator('mosaik-dialog-header').last()).toContainText(
      'Connect AI account',
    );
    const runtimeChoiceLayout = await settings
      .getByTestId('ai-runtime-choice')
      .evaluate((group) => {
        const groupRect = group.getBoundingClientRect();
        const root = group.shadowRoot?.querySelector<HTMLElement>('[part="root"]');
        const choices = Array.from(group.querySelectorAll<HTMLElement>('mosaik-choice')).map(
          (choice) => ({
            clientWidth: choice.clientWidth,
            rect: choice.getBoundingClientRect(),
            scrollWidth: choice.scrollWidth,
          }),
        );
        return {
          allChoicesInsideGroup: choices.every(
            ({ rect }) => rect.left >= groupRect.left - 0.5 && rect.right <= groupRect.right + 0.5,
          ),
          choicesOverlap: choices.some(({ rect }, index) =>
            choices
              .slice(index + 1)
              .some(
                ({ rect: other }) =>
                  rect.left < other.right &&
                  rect.right > other.left &&
                  rect.top < other.bottom &&
                  rect.bottom > other.top,
              ),
          ),
          choiceWidths: choices.map(({ clientWidth, scrollWidth }) => ({
            clientWidth,
            scrollWidth,
          })),
          groupClientWidth: group.clientWidth,
          groupScrollWidth: group.scrollWidth,
          groupFits: group.scrollWidth <= group.clientWidth,
          rootClientWidth: root?.clientWidth ?? null,
          rootScrollWidth: root?.scrollWidth ?? null,
        };
      });
    expect(runtimeChoiceLayout, JSON.stringify(runtimeChoiceLayout)).toMatchObject({
      allChoicesInsideGroup: true,
      choicesOverlap: false,
      groupFits: true,
    });
    await expect(settings.getByTestId('ai-provider-opencode')).toHaveJSProperty('isChecked', true);
    // OpenCode runs its free models without any sign-in: saving is enough, importing is optional.
    await expect(settings.getByTestId('connect-ai-account')).toHaveCount(0);
    await expect(settings.getByTestId('ai-account-status')).toContainText(
      'Not needed for free models',
    );
    await expect(settings.getByTestId('import-opencode-credentials')).toBeVisible();
    await settings.getByTestId('ai-account-name').locator('input').fill('Free OpenCode account');
    await expect(settings.getByTestId('save-settings-editor')).toBeEnabled();
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(settings.getByTestId(`configured-accounts-${workspaceId}`)).toContainText(
      'Free OpenCode account',
    );
    // The optional import stays available on the saved account.
    await settings
      .getByTestId(`configured-accounts-${workspaceId}`)
      .locator('[test-id^="configured-account-opencode-"]')
      .locator('[test-id^="edit-account-"]')
      .click();
    await settings.getByTestId('import-opencode-credentials').click();
    // The import is confirmed in an alert sheet of the Settings window.
    const importConfirmation = settings.locator(
      '[test-id^="settings-alert-import-opencode-credentials-"]:not([test-id$="-confirm"]):not([test-id$="-cancel"])',
    );
    await expect(importConfirmation).toContainText('Import current OpenCode sign-ins?');
    await expect(importConfirmation).toContainText('one workspace account');
    // The alert's buttons sit in the sheet's footer, beside its message.
    await settings
      .locator('[test-id^="settings-alert-import-opencode-credentials-"][test-id$="-cancel"]')
      .click();
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // The agent only picks the account; models come from the OpenCode CLI as cards.
    await settings.getByTestId('workspace-settings-section-team').click();
    await settings.getByTestId(`add-ai-account-${workspaceId}`).click();
    await settings
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-opencode-"]')
      .click();
    await expect(settings.getByTestId('agent-wizard')).toContainText('OpenCode');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('OmniRoute');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Provider catalog');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Reload from OpenCode');
    await expect(settings.getByTestId('agent-wizard')).not.toContainText('Model ID');
    await expect(settings.getByTestId('opencode-provider-opencode')).toHaveCount(0);
    await expect(settings.getByTestId('ai-model-opencode/mimo-v2.5-free')).toBeVisible();
    await settings.getByTestId('ai-model-opencode/mimo-v2.5-free').click();
    await expect(settings.getByTestId('ai-reasoning-high')).toBeVisible();
    await settings.getByTestId('ai-reasoning-high').click();
    // Let the click ripples finish before measuring; they overshoot their card while animating.
    await settings.waitForTimeout(800);
    const wizardLayout = await settings.getByTestId('agent-wizard').evaluate((wizard) => {
      const drawer = wizard.closest<HTMLElement>('[test-id="settings-editor-drawer"]');
      // Focus rings overshoot their card by ~1px; anything larger is real horizontal overflow.
      return {
        wizardFits: wizard.scrollWidth <= wizard.clientWidth + 4,
        drawerFits: !!drawer && drawer.scrollWidth <= drawer.clientWidth + 4,
      };
    });
    expect(wizardLayout, JSON.stringify(wizardLayout)).toMatchObject({
      wizardFits: true,
      drawerFits: true,
    });
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'workspace-opencode-providers.png'),
      fullPage: true,
    });
    await settings.getByTestId('ai-display-name').locator('input').fill('Free implementer');
    await settings.getByTestId('ai-position-name').locator('input').fill('Implementation Agent');
    await settings
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Implements approved plans.');
    await expect(
      settings.getByTestId(/^agent-character-(blue|mint|coral|violet|gold|rose)$/u),
    ).toHaveCount(6);
    // The preview shows the agent card being built.
    await expect(settings.getByTestId('agent-appearance-preview')).toHaveCount(1);
    await settings.getByTestId('agent-character-gold').click();
    await expect(settings.getByTestId('agent-character-picker')).toHaveJSProperty('value', 'gold');
    await expect(settings.getByTestId('agent-character-gold')).toHaveJSProperty('isChecked', true);
    await expect(
      settings.getByTestId('agent-character-preview-gold').locator('[data-figure-image]'),
    ).toHaveAttribute('src', /figures\/gold\.png/u);
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'new-agent-appearance.png'),
      fullPage: true,
    });
    await settings.getByTestId('ai-role-solution').click();
    await expect(settings.getByTestId('agent-preview-steps')).toContainText('Implement and verify');
    await expect(settings.getByTestId('agent-preview-name')).toHaveJSProperty(
      'text',
      'Free implementer',
    );
    await expect(settings.getByTestId('save-settings-editor')).toBeEnabled();
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);

    const delegated = await page.evaluate(async (selectedWorkspaceId) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      const agent = current.agentProfiles.find((item) => item.displayName === 'Free implementer');
      const route = current.agentRoutePolicies.find((item) => item.id === agent?.routePolicyId);
      const connection = current.connections.find(
        (item) => item.id === route?.candidates[0]?.aiConnectionId,
      );
      const assignment = current.agentTeams
        .find((item) => item.workspaceId === selectedWorkspaceId)
        ?.assignments.find((item) => item.role === 'solution');
      return { connection, route, agent, assignment };
    }, workspaceId);
    expect(delegated.connection).toMatchObject({
      kind: 'opencode',
      displayName: 'Free OpenCode account',
    });
    expect(delegated.agent).toMatchObject({
      workspaceId,
      displayName: 'Free implementer',
      appearance: { figure: 'dot', color: 'gold', accessories: [] },
    });
    expect(delegated.route).toMatchObject({
      strategy: 'balanced',
      costPolicy: 'any',
      candidates: [
        {
          model: 'opencode/mimo-v2.5-free',
          reasoningEffort: 'high',
          costClass: 'unknown',
        },
      ],
    });
    expect(delegated.assignment).toMatchObject({
      primaryAgentId: delegated.agent?.id,
      fallbackAgentIds: [agent.id],
      // Responsibilities no longer carry a skill package: the instructions of a built-in role
      // are configured once under Settings · Skills.
      skillId: null,
    });
    await expect(settings.getByTestId(`workspace-agent-${delegated.agent!.id}`)).toContainText(
      'Free implementer',
    );
    const delegatedAvatar = settings
      .getByTestId(`agent-avatar-${delegated.agent!.id}`)
      .locator('[data-figure-image]');
    await expect(delegatedAvatar).toHaveAttribute('src', /figures\/gold/u);
    // The delegated agent implements, the default agent backs it up.
    const implementStep = settings.getByTestId('delivery-flow-step-implement');
    await expect(implementStep).toContainText('Free implementer');
    await expect(implementStep).toContainText('then');
    await expect(
      implementStep.getByTestId(`delivery-flow-agent-implement-${agent.id}`),
    ).toContainText('Default agent');
    await expect(settings.getByTestId('delivery-flow-step-plan')).toContainText('Default agent');
    // An account that an agent runs on cannot be removed; the dialog names the agent.
    await settings.getByTestId('workspace-settings-section-services').click();
    await settings.getByTestId(`remove-account-${delegated.connection!.id}`).click();
    // The notice is an alert sheet of the Settings window.
    const removalBlocked = settings.getByTestId(
      `settings-alert-remove-ai-account-blocked-${delegated.connection!.id}`,
    );
    await expect(removalBlocked).toContainText('still in use');
    await expect(removalBlocked).toContainText('Free implementer');
    await settings
      .getByTestId(`settings-alert-remove-ai-account-blocked-${delegated.connection!.id}-confirm`)
      .click();
    await expect(removalBlocked).toHaveCount(0);
    await expect(
      settings.getByTestId(`configured-account-${delegated.connection!.id}`),
    ).toBeVisible();
    await settings.getByTestId('workspace-settings-section-team').click();
    await settings.getByTestId(`edit-agent-account-${delegated.agent!.id}`).click();
    await expect(settings.getByTestId('import-opencode-credentials')).toHaveCount(0);
    await expect(settings.getByTestId('ai-model')).toHaveJSProperty(
      'value',
      'opencode/mimo-v2.5-free',
    );
    await expect(settings.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'high');
    await expect(settings.getByTestId('agent-character-picker')).toHaveJSProperty('value', 'gold');
    await expect(settings.getByTestId('agent-character-gold')).toHaveJSProperty('isChecked', true);
    await settings.getByTestId('agent-character-rose').click();
    await expect(settings.getByTestId('agent-character-picker')).toHaveJSProperty('value', 'rose');
    await expect(settings.getByTestId('agent-character-rose')).toHaveJSProperty('isChecked', true);
    await expect(settings.getByTestId('agent-character-gold')).toHaveJSProperty('isChecked', false);
    await settings.getByTestId('cancel-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(delegatedAvatar).toHaveAttribute('src', /figures\/gold/u);

    for (const specialist of [
      {
        name: 'Architecture Agent',
        position: 'Solution Architect',
        description: 'Turns requirements into implementation-ready plans.',
        role: 'analysis',
      },
      {
        name: 'Quality Agent',
        position: 'Quality Engineer',
        description: 'Investigates failed checks and protects delivery quality.',
        role: 'ci-diagnosis',
      },
    ] as const) {
      await settings.getByTestId(`add-ai-account-${workspaceId}`).click();
      await settings.getByTestId(`ai-account-${candidate.aiConnectionId}`).click();
      await settings.getByTestId('ai-display-name').locator('input').fill(specialist.name);
      await settings.getByTestId('ai-position-name').locator('input').fill(specialist.position);
      await settings
        .getByTestId('ai-position-description')
        .locator('input')
        .fill(specialist.description);
      await settings.getByTestId(`ai-role-${specialist.role}`).click();
      await expect(settings.getByTestId('save-settings-editor')).toBeEnabled();
      await settings.getByTestId('save-settings-editor').click();
      await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    }
    await expect(
      settings
        .getByTestId(`workspace-agents-${workspaceId}`)
        .locator('[test-id^="workspace-agent-"]'),
    ).toHaveCount(4);

    // Removing an agent hands its responsibility to an agent whose position allows that role.
    await settings.getByTestId(`remove-agent-${delegated.agent!.id}`).click();
    // Removing an agent is confirmed in an alert sheet of the Settings window.
    const agentRemoval = settings.getByTestId(`settings-alert-remove-agent-${delegated.agent!.id}`);
    await expect(agentRemoval).toContainText('Remove Free implementer?');
    await settings
      .getByTestId(`settings-alert-remove-agent-${delegated.agent!.id}-confirm`)
      .click();
    await expect(agentRemoval).toHaveCount(0);
    await expect(
      settings
        .getByTestId(`workspace-agents-${workspaceId}`)
        .locator('[test-id^="workspace-agent-"]'),
    ).toHaveCount(3);
    await expect(settings.getByTestId('delivery-flow-step-implement')).not.toContainText(
      'Free implementer',
    );
    expect(
      await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const current = await api.request('settings.get', {});
        return current.agentProfiles.some((item) => item.displayName === 'Free implementer');
      }),
    ).toBe(false);
    // The agent cards and the `Add an AI agent` card stay inside the two-column grid.
    const agentGrid = settings.getByTestId(`workspace-agents-${workspaceId}`);
    const agentCards = agentGrid.locator(
      ':scope > [test-id^="workspace-agent-"], :scope > [test-id^="ai-accounts-"]',
    );
    await expect(agentCards).toHaveCount(4);
    expect(
      await agentGrid.evaluate((grid) => {
        const gridRect = grid.getBoundingClientRect();
        return [...grid.children].every((card) => {
          const rect = card.getBoundingClientRect();
          return (
            rect.left >= gridRect.left - 0.5 &&
            rect.right <= gridRect.right + 0.5 &&
            card.scrollWidth <= card.clientWidth + 1
          );
        });
      }),
    ).toBe(true);
    await expect(settings.getByTestId('delivery-flow-step-plan')).toContainText(
      'Architecture Agent',
    );
    await expect(settings.getByTestId('delivery-flow-step-fix-checks')).toContainText(
      'Quality Agent',
    );
    await settings.getByTestId(`workspace-organization-${workspaceId}`).evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
    await settings.waitForTimeout(400);
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'workspace-organization-settings.png'),
      fullPage: true,
    });

    await settings.getByTestId('global-settings-section-workspaces').click();
    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await expect(settings.getByTestId(`workspace-card-${workspaceId}`)).toHaveCount(0);
    // The list names each workspace in a row; `Import workspace` and `Add workspace` are its actions.
    await expect(settings.getByTestId(`workspace-directory-item-${workspaceId}`)).toBeVisible();
    const directoryActions = await settings
      .getByTestId('workspace-directory')
      .locator('mosaik-button[test-id$="-workspace"]')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('test-id')));
    expect(directoryActions.slice(0, 2)).toEqual(['import-workspace', 'add-workspace']);
    await settings.waitForTimeout(400);
    await settings.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'workspace-directory-settings.png'),
      fullPage: true,
    });
    await settings.getByTestId(`workspace-navigation-item-${workspaceId}`).click();
    await expect(settings.getByTestId(`workspace-card-${workspaceId}`)).toBeVisible();
    await settings.getByTestId('global-settings-section-workspaces').click();
    await expect(settings.getByTestId('workspace-directory')).toBeVisible();
    await settings.getByTestId(`open-workspace-settings-${workspaceId}`).click();
    await expect(settings.getByTestId(`workspace-card-${workspaceId}`)).toBeVisible();
    await expect(settings.getByTestId('workspace-directory')).toHaveCount(0);
    // The selected workspace shows its sections nested below it in the sidebar.
    await expect(settings.getByTestId(`workspace-navigation-item-${workspaceId}`)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(settings.getByTestId('add-workspace')).toHaveCount(0);
    await settings.getByTestId('global-settings-section-workspaces').click();
    await expect(settings.getByTestId('add-workspace')).toBeVisible();
    await expect(settings.getByTestId('import-workspace')).toBeVisible();
    // `Import skill` moved from System to the Skills section's toolbar.
    await settings.getByTestId('global-settings-section-skills').click();
    await expect(settings.getByTestId('open-skill-import')).toBeVisible();
    await settings.getByTestId('global-settings-section-workspaces').click();

    await settings.getByTestId('add-workspace').click();
    await settings.getByTestId('workspace-name').locator('input').fill('Customer workspace');
    await settings.getByTestId('workspace-short-code').locator('input').fill('CUST');
    await settings.getByTestId('workspace-color').locator('input').fill('#038387');
    await settings.getByTestId('save-settings-editor').click();
    await expect(settings.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const addedWorkspaceId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      return current.workspaces.find((item) => item.displayName === 'Customer workspace')?.id;
    });
    expect(addedWorkspaceId).toBeTruthy();
    await expect(settings.getByTestId(`workspace-card-${addedWorkspaceId!}`)).toBeVisible();
    await expect(settings.getByTestId(`workspace-card-${workspaceId}`)).toHaveCount(0);
    // The selected workspace shows its sections nested below it in the sidebar.
    await expect(
      settings.getByTestId(`workspace-navigation-item-${addedWorkspaceId!}`),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
