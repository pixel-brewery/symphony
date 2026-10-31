// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('global-workspace-filter').click();
    await page.getByTestId('workspace-menu-settings').click();

    const settings = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return api.request('settings.get', {});
    });
    const workspaceId = settings.workspaces[0]!.id;
    const position = settings.positions.find((item) => item.workspaceId === workspaceId)!;
    const agent = settings.agentProfiles.find((item) => item.workspaceId === workspaceId)!;
    const team = settings.agentTeams.find((item) => item.workspaceId === workspaceId)!;
    const route = settings.agentRoutePolicies.find((item) => item.workspaceId === workspaceId)!;
    const candidate = route.candidates[0]!;
    const provider = settings.providerManifests.find((item) => item.workspaceId === workspaceId)!;

    await expect(page.getByTestId('workspace-directory')).toBeVisible();
    await page.getByTestId(`open-workspace-settings-${workspaceId}`).click();
    await expect(page.getByTestId(`workspace-card-${workspaceId}`)).toBeVisible();
    // The primary navigation deliberately floats over the full-height route. Scroll the settings
    // document as a user would before activating a control that initially rests behind the dock.
    await page.getByTestId('presenter-route-scroll').hover();
    await page.mouse.wheel(0, 400);
    await page.getByTestId(`workspace-ai-technical-${workspaceId}`).click();
    await expect(page.getByTestId(`workspace-position-${position.id}`)).toContainText(
      position.displayName,
    );
    await expect(page.getByTestId(`workspace-agent-${agent.id}`)).toContainText(agent.displayName);
    await expect(page.getByTestId(`workspace-team-${team.id}`)).toBeVisible();
    await expect(page.getByTestId(`workspace-provider-${provider.id}`)).toContainText(
      provider.providerId,
    );
    await expect(page.getByTestId(`workspace-route-${route.id}`)).toContainText(route.displayName);
    await expect(page.getByTestId(`workspace-route-candidate-${candidate.id}`)).toContainText(
      'Default Codex account',
    );

    // Connect an OpenCode account once under Connected services.
    await page.getByTestId('workspace-settings-section-services').click();
    await page.getByTestId(`add-ai-runtime-account-opencode-${workspaceId}`).click();
    await expect(page.locator('mosaik-drawer-header').last()).toContainText('Connect AI account');
    const runtimeChoiceLayout = await page.getByTestId('ai-runtime-choice').evaluate((group) => {
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
    await expect(page.getByTestId('ai-provider-opencode')).toHaveJSProperty('isChecked', true);
    // OpenCode runs its free models without any sign-in: saving is enough, importing is optional.
    await expect(page.getByTestId('connect-ai-account')).toHaveCount(0);
    await expect(page.getByTestId('ai-account-status')).toContainText('Not needed for free models');
    await expect(page.getByTestId('import-opencode-credentials')).toBeVisible();
    await page.getByTestId('ai-account-name').locator('input').fill('Free OpenCode account');
    await expect(page.getByTestId('save-settings-editor')).toBeEnabled();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(page.getByTestId(`configured-accounts-${workspaceId}`)).toContainText(
      'Free OpenCode account',
    );
    // The optional import stays available on the saved account.
    await page
      .getByTestId(`configured-accounts-${workspaceId}`)
      .locator('mosaik-cell[test-id^="configured-account-opencode-"]')
      .getByRole('button', { name: 'Edit' })
      .click();
    await page.getByTestId('import-opencode-credentials').click();
    const importConfirmation = page.locator('mosaik-message-box').last();
    await expect(importConfirmation).toContainText('Import current OpenCode sign-ins?');
    await expect(importConfirmation).toContainText('one workspace account');
    await importConfirmation.getByText('Cancel', { exact: true }).click();
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);

    // The agent only picks the account; models come from the OpenCode CLI as cards.
    await page.getByTestId('workspace-settings-section-team').click();
    await page.getByTestId(`add-ai-account-${workspaceId}`).click();
    await page
      .getByTestId('settings-editor-drawer')
      .locator('mosaik-choice[test-id^="ai-account-opencode-"]')
      .click();
    await expect(page.getByTestId('agent-wizard')).toContainText('OpenCode');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('OmniRoute');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Provider catalog');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Usage type');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Reload from OpenCode');
    await expect(page.getByTestId('agent-wizard')).not.toContainText('Model ID');
    await expect(page.getByTestId('opencode-provider-opencode')).toHaveCount(0);
    await expect(page.getByTestId('ai-model-opencode/mimo-v2.5-free')).toBeVisible();
    await page.getByTestId('ai-model-opencode/mimo-v2.5-free').click();
    await expect(page.getByTestId('ai-reasoning-high')).toBeVisible();
    await page.getByTestId('ai-reasoning-high').click();
    // Let the click ripples finish before measuring; they overshoot their card while animating.
    await page.waitForTimeout(800);
    const wizardLayout = await page.getByTestId('agent-wizard').evaluate((wizard) => {
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
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'workspace-opencode-providers.png'),
      fullPage: true,
    });
    await page.getByTestId('agent-ai-next').click();
    await page.getByTestId('ai-display-name').locator('input').fill('Free implementer');
    await page.getByTestId('ai-position-name').locator('input').fill('Implementation Agent');
    await page
      .getByTestId('ai-position-description')
      .locator('input')
      .fill('Implements approved plans.');
    await expect(
      page.getByTestId(/^agent-character-(blue|mint|coral|violet|gold|rose)$/u),
    ).toHaveCount(6);
    await expect(page.getByTestId('agent-appearance-preview')).toHaveCount(0);
    await page.getByTestId('agent-character-gold').click();
    await expect(page.getByTestId('agent-character-picker')).toHaveJSProperty('value', 'gold');
    await expect(page.getByTestId('agent-character-gold')).toHaveJSProperty('isChecked', true);
    await expect(
      page.getByTestId('agent-character-preview-gold').locator('[data-figure-image]'),
    ).toHaveAttribute('src', /figures\/gold\.png/u);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'new-agent-appearance.png'),
      fullPage: true,
    });
    await page.getByTestId('agent-identity-next').click();
    await page.getByTestId('ai-role-solution').click();
    await page.getByTestId('agent-responsibilities-next').click();
    await expect(page.getByTestId('agent-ready-to-save')).toBeVisible();
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);

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
    await expect(page.getByTestId(`workspace-agent-${delegated.agent!.id}`)).toContainText(
      'Free implementer',
    );
    const delegatedAvatar = page.getByTestId(`agent-avatar-${delegated.agent!.id}`);
    await expect(delegatedAvatar).toHaveJSProperty('src', 'figures/gold-48.png');
    await expect(delegatedAvatar).toHaveAttribute('aria-label', 'Free implementer');
    await expect(page.getByTestId('workspace-team-assignment-solution')).toContainText(
      'Free implementer · Backup: Default agent',
    );
    await expect(page.getByTestId('workspace-team-assignment-analysis')).toContainText(
      'Default agent',
    );
    // An account that an agent runs on cannot be removed; the dialog names the agent.
    await page.getByTestId('workspace-settings-section-services').click();
    await page.getByTestId(`remove-account-${delegated.connection!.id}`).click();
    const removalBlocked = page.locator('mosaik-message-box').last();
    await expect(removalBlocked).toContainText('still in use');
    await expect(removalBlocked).toContainText('Free implementer');
    await removalBlocked.getByText('OK', { exact: true }).click();
    await expect(removalBlocked).toHaveCount(0);
    await expect(page.getByTestId(`configured-account-${delegated.connection!.id}`)).toBeVisible();
    await page.getByTestId('workspace-settings-section-team').click();
    await page.getByTestId(`edit-agent-account-${delegated.agent!.id}`).click();
    await expect(page.getByTestId('import-opencode-credentials')).toHaveCount(0);
    await expect(page.getByTestId('ai-model')).toHaveJSProperty('value', 'opencode/mimo-v2.5-free');
    await expect(page.getByTestId('ai-reasoning')).toHaveJSProperty('value', 'high');
    await page.getByTestId('agent-ai-next').click();
    await expect(page.getByTestId('agent-character-picker')).toHaveJSProperty('value', 'gold');
    await expect(page.getByTestId('agent-character-gold')).toHaveJSProperty('isChecked', true);
    await page.getByTestId('agent-character-rose').click();
    await expect(page.getByTestId('agent-character-picker')).toHaveJSProperty('value', 'rose');
    await expect(page.getByTestId('agent-character-rose')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('agent-character-gold')).toHaveJSProperty('isChecked', false);
    await page.getByTestId('cancel-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    await expect(delegatedAvatar).toHaveJSProperty('src', 'figures/gold-48.png');

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
      await page.getByTestId(`add-ai-account-${workspaceId}`).click();
      await page.getByTestId(`ai-account-${candidate.aiConnectionId}`).click();
      await page.getByTestId('agent-ai-next').click();
      await page.getByTestId('ai-display-name').locator('input').fill(specialist.name);
      await page.getByTestId('ai-position-name').locator('input').fill(specialist.position);
      await page
        .getByTestId('ai-position-description')
        .locator('input')
        .fill(specialist.description);
      await page.getByTestId('agent-identity-next').click();
      await page.getByTestId(`ai-role-${specialist.role}`).click();
      await page.getByTestId('agent-responsibilities-next').click();
      await expect(page.getByTestId('agent-ready-to-save')).toBeVisible();
      await page.getByTestId('save-settings-editor').click();
      await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    }
    await expect(
      page.getByTestId(`workspace-agents-${workspaceId}`).locator('[test-id^="workspace-agent-"]'),
    ).toHaveCount(4);

    // Removing an agent hands its responsibility to an agent whose position allows that role.
    await page.getByTestId(`remove-agent-${delegated.agent!.id}`).click();
    const agentRemoval = page.locator('mosaik-message-box').last();
    await expect(agentRemoval).toContainText('Remove Free implementer?');
    await agentRemoval.getByText('Remove agent', { exact: true }).click();
    await expect(agentRemoval).toHaveCount(0);
    await expect(
      page.getByTestId(`workspace-agents-${workspaceId}`).locator('[test-id^="workspace-agent-"]'),
    ).toHaveCount(3);
    await expect(page.getByTestId('workspace-team-assignment-solution')).not.toContainText(
      'Free implementer',
    );
    expect(
      await page.evaluate(async () => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const current = await api.request('settings.get', {});
        return current.agentProfiles.some((item) => item.displayName === 'Free implementer');
      }),
    ).toBe(false);
    const agentRows = page
      .getByTestId(`workspace-agents-${workspaceId}`)
      .locator('mosaik-cell[test-id^="workspace-agent-"], mosaik-cell[test-id^="ai-accounts-"]');
    await expect(agentRows).toHaveCount(4);
    for (const row of await agentRows.all()) {
      await expect
        .poll(() =>
          row.evaluate((element) => {
            const cellRect = element.getBoundingClientRect();
            const root = element.shadowRoot?.querySelector<HTMLElement>('[part="root"]');
            const action = element.querySelector<HTMLElement>('mosaik-button[slot="end"]');
            const actionRect = action?.getBoundingClientRect();
            const rootRect = root?.getBoundingClientRect();
            const text = root?.querySelector<HTMLElement>('[part="text"]');
            return {
              actionInsideCell: !!actionRect && actionRect.right <= cellRect.right + 0.5,
              // Hard elevation extends the scrollable area without widening the actual cell content.
              rootFits:
                !!rootRect &&
                !!text &&
                text.scrollWidth <= text.clientWidth + 1 &&
                [...element.children].every(
                  (child) => child.getBoundingClientRect().right <= rootRect.right + 0.5,
                ),
            };
          }),
        )
        .toMatchObject({
          actionInsideCell: true,
          rootFits: true,
        });
    }
    await expect(page.getByTestId('workspace-team-assignment-analysis')).toContainText(
      'Architecture Agent',
    );
    await expect(page.getByTestId('workspace-team-assignment-ci-diagnosis')).toContainText(
      'Quality Agent',
    );
    await page.getByTestId(`workspace-organization-${workspaceId}`).evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'workspace-organization-settings.png'),
      fullPage: true,
    });

    await page.getByTestId('global-settings-section-workspaces').click();
    await expect(page.getByTestId('workspace-directory')).toBeVisible();
    await expect(page.getByTestId(`workspace-card-${workspaceId}`)).toHaveCount(0);
    const directoryCardOrder = await page
      .getByTestId('workspace-directory-list')
      .locator(':scope > mosaik-button')
      .evaluateAll((tiles) => tiles.slice(0, 2).map((tile) => tile.getAttribute('test-id')));
    expect(directoryCardOrder).toEqual(['add-workspace', 'import-workspace']);
    await page.waitForTimeout(400);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'workspace-directory-settings.png'),
      fullPage: true,
    });
    await page.getByTestId(`workspace-navigation-item-${workspaceId}`).click();
    await expect(page.getByTestId(`workspace-card-${workspaceId}`)).toBeVisible();
    await page.getByTestId('global-settings-section-workspaces').click();
    await expect(page.getByTestId('workspace-directory')).toBeVisible();
    await page.getByTestId(`open-workspace-settings-${workspaceId}`).click();
    await expect(page.getByTestId(`workspace-card-${workspaceId}`)).toBeVisible();
    await expect(page.getByTestId('workspace-directory')).toHaveCount(0);
    await expect(page.getByTestId(`workspace-navigation-item-${workspaceId}`)).toHaveJSProperty(
      'isActive',
      true,
    );
    await expect(page.getByTestId('add-workspace')).toHaveCount(0);
    await page.getByTestId('global-settings-section-workspaces').click();
    await expect(page.getByTestId('add-workspace')).toBeVisible();
    await expect(page.getByTestId('import-workspace')).toBeVisible();
    await page.getByTestId('global-settings-section-system').click();
    await expect(page.getByTestId('open-skill-import')).toBeVisible();
    await page.getByTestId('global-settings-section-workspaces').click();

    await page.getByTestId('add-workspace').click();
    await page.getByTestId('workspace-name').locator('input').fill('Customer workspace');
    await page.getByTestId('workspace-short-code').locator('input').fill('CUST');
    await page.getByTestId('workspace-color').locator('input').fill('#038387');
    await page.getByTestId('save-settings-editor').click();
    await expect(page.getByTestId('settings-editor-drawer')).toHaveCount(0);
    const addedWorkspaceId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      return current.workspaces.find((item) => item.displayName === 'Customer workspace')?.id;
    });
    expect(addedWorkspaceId).toBeTruthy();
    await expect(page.getByTestId(`workspace-card-${addedWorkspaceId!}`)).toBeVisible();
    await expect(page.getByTestId(`workspace-card-${workspaceId}`)).toHaveCount(0);
    await expect(
      page.getByTestId(`workspace-navigation-item-${addedWorkspaceId!}`),
    ).toHaveJSProperty('isActive', true);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
