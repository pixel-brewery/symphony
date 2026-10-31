// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { openSettingsWindow } from './openSettingsWindow';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('operates a real 3D orbit with 1,000 tickets, 25 employees and shared workflow selection', async () => {
  // arrange
  const root = resolve('output/playwright/orbit-redesign');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const launchOptions = {
    args: ['.'],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: root,
      SYMPHONY_DATABASE_PATH: resolve(root, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(root, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(root, 'legacy'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS: '998',
      SYMPHONY_SIMULATED_CI_JOB_COUNT: '200',
    },
  };
  let app = await electron.launch(launchOptions);
  try {
    let page = await prepareMainWindow(app);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const base = settings.agentProfiles[0]!;
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [
            ...settings.connections,
            {
              id: 'scene-github',
              workspaceId: 'personal',
              kind: 'github',
              displayName: 'Fixture GitHub',
              hostname: 'github.com',
              gitProtocol: 'https',
            },
          ],
          repositoryBindings: [
            {
              id: 'scene-repository',
              workspaceId: 'personal',
              sourceControlConnectionId: 'scene-github',
              provider: 'simulated',
              displayName: 'Fixture repository',
              host: 'github.com',
              owner: 'fixture',
              name: 'repo',
              defaultBranch: 'main',
              localPath: '',
              enabled: true,
            },
          ],
          ciBindings: [
            {
              id: 'scene-ci',
              workspaceId: 'personal',
              repositoryBindingId: 'scene-repository',
              sourceControlConnectionId: 'scene-github',
              provider: 'github-actions',
              displayName: 'Fixture Actions',
              enabled: true,
              agenticDeliveryEnabled: false,
            },
          ],
          deliveryTargets: [
            {
              id: 'scene-production',
              workspaceId: 'personal',
              repositoryBindingId: 'scene-repository',
              displayName: 'Production',
              kind: 'environment',
              environment: 'production',
              production: true,
            },
            {
              id: 'scene-staging',
              workspaceId: 'personal',
              repositoryBindingId: 'scene-repository',
              displayName: 'Staging',
              kind: 'environment',
              environment: 'staging',
              production: false,
            },
            {
              id: 'scene-stable',
              workspaceId: 'personal',
              repositoryBindingId: 'scene-repository',
              displayName: 'Stable releases',
              kind: 'release-channel',
              environment: 'stable',
              production: false,
            },
            {
              id: 'scene-installation',
              workspaceId: 'personal',
              repositoryBindingId: 'scene-repository',
              displayName: 'Installed application',
              kind: 'installation',
              environment: 'desktop',
              production: false,
            },
          ],
          agentProfiles: Array.from({ length: 25 }, (_, index) => ({
            ...base,
            id: index === 0 ? base.id : `scene-employee-${index}`,
            displayName: `Employee ${index}`,
            appearance: {
              figure: 'pebble',
              color: (['mint', 'violet', 'blue', 'coral', 'gold', 'rose'] as const)[index % 6]!,
              accessories: ['glasses', 'headphones', 'badge'],
            },
          })),
        },
      });
      await api.request('snapshot.refresh', {});
    });
    // act
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((window) => !window.webContents.getURL().includes('/menu-bar'))
        ?.reload(),
    );
    // Symphony opens on Overview; Orbit is a Delivery entry in the sidebar.
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Orbit');
    await expect(page.getByTestId('orbit-destination-menu')).toBeVisible();
    await expect(page.getByTestId('orbit-inspector')).toContainText('Selected cluster');
    const canvas = page.getByTestId('orbit-canvas');
    const webgl = page.getByTestId('orbit-webgl');
    await expect(canvas).toHaveAttribute('data-ticket-count', '1000');
    await expect(page.getByTestId('orbit-view').locator('symphony-agent-figure')).toHaveCount(0);
    await expect(page.getByTestId('orbit-label-group:team')).toHaveCount(0);
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    expect(
      await webgl.evaluate((element) => {
        const context = (element as HTMLCanvasElement).getContext('webgl2');
        return {
          canvas: element instanceof HTMLCanvasElement,
          webgl: context instanceof WebGL2RenderingContext,
          width: context?.drawingBufferWidth ?? 0,
          height: context?.drawingBufferHeight ?? 0,
        };
      }),
    ).toMatchObject({ canvas: true, webgl: true });
    expect(await webgl.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(
      0,
    );
    expect(Number(await canvas.getAttribute('data-label-count'))).toBeLessThan(80);
    for (const removed of [
      'landscape-ticket-list',
      'landscape-overview',
      'landscape-stages',
      'landscape-team',
      'landscape-board',
      'landscape-setup',
      'landscape-spatial',
    ])
      await expect(page.getByTestId(removed)).toHaveCount(0);
    const camera = () =>
      canvas.evaluate((element) =>
        ['x', 'y', 'z', 'target-x', 'target-y', 'target-z']
          .map((coordinate) => Number(element.getAttribute('data-camera-' + coordinate)).toFixed(5))
          .join(','),
      );
    const loseContext = async () => {
      expect(
        await webgl.evaluate((element) => {
          const context = (element as HTMLCanvasElement).getContext('webgl2');
          const extension = context?.getExtension('WEBGL_lose_context');
          if (!extension) return false;
          extension.loseContext();
          return true;
        }),
      ).toBe(true);
      await expect(canvas).toHaveAttribute('data-render-state', 'context-lost');
      await expect(page.getByTestId('orbit-webgl-fallback')).toBeVisible();
    };
    const initialCamera = await camera();
    const sceneBounds = (await webgl.boundingBox())!;
    await page.mouse.move(
      sceneBounds.x + sceneBounds.width * 0.85,
      sceneBounds.y + sceneBounds.height * 0.8,
    );
    await page.mouse.down();
    await page.mouse.move(
      sceneBounds.x + sceneBounds.width * 0.85 - 90,
      sceneBounds.y + sceneBounds.height * 0.8 - 35,
      { steps: 8 },
    );
    await page.mouse.up();
    await expect.poll(camera).not.toBe(initialCamera);
    const rotatedCamera = await camera();
    await page.mouse.wheel(0, -350);
    await expect.poll(camera).not.toBe(rotatedCamera);
    const zoomedCamera = await camera();
    await page.getByTestId('landscape-fit').click();
    await expect.poll(camera).not.toBe(zoomedCamera);
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    // Stage clusters: one `Label · count` badge per cluster around the destination.
    const groupCounts = page.getByTestId(/^orbit-group-count-group:/u);
    await expect.poll(() => groupCounts.count()).toBeGreaterThan(0);
    const readableGroups = await groupCounts.evaluateAll((elements) =>
      elements.map((element) => {
        const badge = element.getBoundingClientRect();
        const label = element.closest('[data-orbit-label]')!.getBoundingClientRect();
        return {
          count: Number(element.getAttribute('data-count')),
          visible: badge.width > 0 && badge.height > 0,
          contained:
            badge.left >= label.left - 1 &&
            badge.top >= label.top - 1 &&
            badge.right <= label.right + 1 &&
            badge.bottom <= label.bottom + 1,
        };
      }),
    );
    expect(
      readableGroups.every((group) => group.count > 0 && group.visible && group.contained),
    ).toBe(true);
    await page.screenshot({ path: resolve(root, 'orbit-3d-1000-tickets.png'), fullPage: true });
    // With 1,000 tickets the Sun's label yields to the planets around it, so Production is
    // reached through the toolbar's destination menu.
    await page.getByTestId('orbit-destination-menu').click();
    await page.getByTestId('orbit-explorer-target-scene-production').click();
    await expect(page.getByTestId('delivery-target-details')).toBeVisible();
    await expect(page.getByTestId('delivery-target-unconfirmed')).toBeVisible();
    await page.getByTestId('orbit-close-delivery-target-details').click();
    await loseContext();
    await page
      .getByTestId('landscape-search')
      .locator('input')
      .fill('Queued reconciliation task 997');
    await expect(page.getByTestId('landscape-ticket-details')).toBeVisible();
    // The inspector's cluster list reaches the same work item from the keyboard.
    await page.getByTestId('orbit-close-landscape-ticket-details').click();
    await page.getByTestId('orbit-explorer-ticket-work-item-overflow-997').focus();
    await page.getByTestId('orbit-explorer-ticket-work-item-overflow-997').press('Enter');
    await expect(page.getByTestId('landscape-ticket-details')).toBeVisible();
    await page.getByTestId('orbit-webgl-retry').click();
    await expect(webgl).toHaveCount(1);
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    await expect(canvas).toHaveAttribute('data-ticket-count', '1');
    await expect(page.getByTestId('ticket-employee')).toHaveCount(0);
    await expect(page.getByTestId('orbit-webgl-fallback')).toHaveCount(0);
    const ticketLabel = page.getByTestId('orbit-label-ticket:work-item-overflow-997');
    await expect(ticketLabel).toBeVisible();
    await page.getByTestId('orbit-close-landscape-ticket-details').click();
    await expect(page.getByTestId('landscape-ticket-details')).toHaveCount(0);
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    const ticketBody = await ticketLabel.evaluate((element) => ({
      x: Number(element.getAttribute('data-scene-x')),
      y: Number(element.getAttribute('data-scene-y')),
    }));
    expect(ticketBody.x).toBeGreaterThan(0);
    expect(ticketBody.y).toBeGreaterThan(0);
    await webgl.click({ position: ticketBody });
    await expect(page.getByTestId('landscape-ticket-details')).toContainText(
      'Queued reconciliation task 997',
    );
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    const focusedCamera = await camera();
    await page.getByTestId('landscape-zoom-reset').click();
    await expect.poll(camera).not.toBe(focusedCamera);
    await expect(page.getByTestId('landscape-zoom-reset')).toHaveJSProperty('label', '100 %');
    const manualCamera = await camera();
    await loseContext();
    await page.getByTestId('orbit-webgl-retry').click();
    await expect(webgl).toHaveCount(1);
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    await expect(canvas).toHaveAttribute('data-ticket-count', '1');
    await expect(page.getByTestId('landscape-ticket-details')).toContainText(
      'Queued reconciliation task 997',
    );
    await expect.poll(camera).toBe(manualCamera);
    await page.getByTestId('landscape-search').locator('input').press('Enter');
    await expect.poll(camera).not.toBe(manualCamera);
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    await expect(page.getByTestId(/^orbit-employee-/u)).toHaveCount(0);
    const selectedCamera = await camera();
    await page.screenshot({ path: resolve(root, 'orbit-3d-selected-ticket.png'), fullPage: true });
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-overflow-997')).toBeVisible();
    await page.getByTestId('navigation-orbit').click();
    await expect(page.getByTestId('landscape-search').locator('input')).toHaveValue(
      'Queued reconciliation task 997',
    );
    await expect(page.getByTestId('landscape-ticket-details')).toContainText(
      'Queued reconciliation task 997',
    );
    await expect(canvas).toHaveAttribute('data-ticket-count', '1');
    await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    await expect.poll(camera).toBe(selectedCamera);
    await page.getByTestId('landscape-clear').click();
    await expect(canvas).toHaveAttribute('data-ticket-count', '1000');
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('orbit-canvas')).toHaveCount(0);
    const agentBeforeEditing = await page.evaluate(async () => {
      const settings = await (
        window as unknown as { orchestration: IOrchestrationApi }
      ).orchestration.request('settings.get', {});
      return settings.agentProfiles.find((agent) => agent.displayName === 'Employee 0')!;
    });
    // Settings is its own window.
    const settingsWindow = await openSettingsWindow(app, page);
    await settingsWindow
      .getByTestId('open-workspace-settings-' + agentBeforeEditing.workspaceId)
      .click();
    await settingsWindow.getByTestId('workspace-settings-section-team').click();
    await settingsWindow.getByTestId('edit-agent-account-' + agentBeforeEditing.id).click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toBeVisible();
    await expect(settingsWindow.getByTestId('ai-display-name').locator('input')).toHaveValue(
      'Employee 0',
    );
    const characterPicker = settingsWindow.getByTestId('agent-character-picker');
    await expect(
      settingsWindow.getByTestId(/^agent-character-(blue|mint|coral|violet|gold|rose)$/u),
    ).toHaveCount(6);
    // The sheet previews the agent card being built, figure included.
    await expect(settingsWindow.getByTestId('agent-appearance-preview')).toHaveCount(1);
    await expect(characterPicker).toHaveJSProperty('value', 'mint');
    await expect(settingsWindow.getByTestId('agent-character-mint')).toHaveJSProperty(
      'isChecked',
      true,
    );
    await settingsWindow.getByTestId('agent-character-blue').focus();
    await settingsWindow.getByTestId('agent-character-blue').press('Space');
    await expect(characterPicker).toHaveJSProperty('value', 'blue');
    await expect(settingsWindow.getByTestId('agent-character-blue')).toHaveJSProperty(
      'isChecked',
      true,
    );
    await expect(settingsWindow.getByTestId('agent-character-mint')).toHaveJSProperty(
      'isChecked',
      false,
    );
    await settingsWindow.getByTestId('ai-display-name').locator('input').fill('Unsaved name');
    await settingsWindow.getByTestId('cancel-settings-editor').click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toHaveCount(0);
    expect(
      await page.evaluate(async (id) => {
        const settings = await (
          window as unknown as { orchestration: IOrchestrationApi }
        ).orchestration.request('settings.get', {});
        return settings.agentProfiles.find((agent) => agent.id === id);
      }, agentBeforeEditing.id),
    ).toEqual(agentBeforeEditing);

    await settingsWindow.getByTestId('edit-agent-account-' + agentBeforeEditing.id).click();
    await expect(characterPicker).toHaveJSProperty('value', 'mint');
    await expect(settingsWindow.getByTestId('agent-character-mint')).toHaveJSProperty(
      'isChecked',
      true,
    );
    await expect(
      settingsWindow.getByTestId('agent-wizard').locator('input[type=file]'),
    ).toHaveCount(0);
    for (const [colour, character] of [
      ['mint', 'mint'],
      ['coral', 'orange'],
      ['violet', 'purple'],
      ['gold', 'gold'],
      ['rose', 'rose'],
      ['blue', 'blue'],
    ]) {
      const choice = settingsWindow.getByTestId('agent-character-' + colour);
      await choice.click();
      await expect(characterPicker).toHaveJSProperty('value', colour);
      await expect(choice).toHaveJSProperty('isChecked', true);
      await expect(
        settingsWindow
          .getByTestId('agent-character-preview-' + colour)
          .locator('[data-figure-image]'),
      ).toHaveAttribute('src', new RegExp('figures/' + character + '\\.png', 'u'));
    }
    await settingsWindow.getByTestId('agent-character-picker').screenshot({
      path: resolve(root, 'original-character-picker.png'),
    });
    await settingsWindow.screenshot({
      path: resolve(root, 'agent-identity-appearance.png'),
      fullPage: true,
    });
    await settingsWindow.getByTestId('save-settings-editor').click();
    await expect(settingsWindow.getByTestId('settings-editor-drawer')).toHaveCount(0);
    expect(
      await page.evaluate(async (id) => {
        const settings = await (
          window as unknown as { orchestration: IOrchestrationApi }
        ).orchestration.request('settings.get', {});
        return settings.agentProfiles.find((agent) => agent.id === id)!.appearance;
      }, agentBeforeEditing.id),
    ).toEqual({ figure: 'dot', color: 'blue', accessories: [] });
    const persisted = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const agent = settings.agentProfiles.find((entry) => entry.displayName === 'Employee 0')!;
      const policy = settings.agentRoutePolicies.find((entry) => entry.id === agent.routePolicyId)!;
      const account = settings.connections.find(
        (connection) => connection.id === policy.candidates[0]!.aiConnectionId,
      )!;
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [
            ...settings.connections,
            { ...account, id: 'scene-cli-replacement', displayName: 'Replacement CLI account' },
          ],
          agentRoutePolicies: [
            ...settings.agentRoutePolicies,
            {
              ...policy,
              id: 'scene-cli-replacement-policy',
              candidates: policy.candidates.map((candidate, index) =>
                index === 0 ? { ...candidate, aiConnectionId: 'scene-cli-replacement' } : candidate,
              ),
            },
          ],
          agentProfiles: settings.agentProfiles.map((entry) =>
            entry.id === agent.id
              ? { ...entry, routePolicyId: 'scene-cli-replacement-policy' }
              : entry,
          ),
        },
      });
      return { id: agent.id, appearance: agent.appearance };
    });
    await app.close();
    app = await electron.launch(launchOptions);
    page = await prepareMainWindow(app);
    page.on('pageerror', (error) => errors.push(error.message));
    const restartedSettings = await openSettingsWindow(app, page);
    await restartedSettings.getByTestId('open-workspace-settings-personal').click();
    await restartedSettings.getByTestId('workspace-settings-section-team').click();
    // The AI team card draws the persisted character as the agent's still figure.
    await expect(
      restartedSettings.getByTestId('agent-avatar-' + persisted.id).locator('[data-figure-image]'),
    ).toHaveAttribute('src', 'figures/blue.png');
    expect(
      await page.evaluate(async () => {
        const settings = await (
          window as unknown as { orchestration: IOrchestrationApi }
        ).orchestration.request('settings.get', {});
        return settings.agentProfiles.find((entry) => entry.displayName === 'Employee 0')!
          .appearance;
      }),
    ).toEqual(persisted.appearance);
    const runId = await page.evaluate(
      async () =>
        (
          await (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
            'ci.runs.refresh',
            {},
          )
        ).ciRuns[0]!.id,
    );
    await page.evaluate((id) => {
      location.hash = '/main/actions?run=' + encodeURIComponent(id);
    }, runId);
    await expect(page.getByTestId('ci-job-graph')).toBeVisible();
    await expect(page.getByTestId(/^ci-graph-job-/u)).toHaveCount(200);
    await expect(page.getByTestId(/^ci-graph-dependency-/u)).toHaveCount(199);
    await expect(page.getByTestId('ci-graph-job-quality')).toBeInViewport();
    await page.screenshot({ path: resolve(root, 'actions-200-jobs-top.png'), fullPage: true });
    await page
      .getByTestId('ci-matrix-quality')
      .getByRole('button', { name: 'Matrix executions (2)' })
      .click();
    await expect(page.getByTestId(/^ci-matrix-run-/u)).toHaveCount(2);
    await page.getByTestId(`ci-matrix-run-${runId}:job:quality`).click();
    await expect(page.getByTestId(`action-detail-job-${runId}:job:quality`)).toBeInViewport();
    await page.screenshot({ path: resolve(root, 'actions-200-jobs.png'), fullPage: true });
    // assert
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.getAttribute('theme'))).toBe('soho');
  } finally {
    await app.close();
  }
});

test('keeps a setup draft unsaved and applies one CLI account before a real read-only ticket analysis', async () => {
  // arrange
  const root = resolve('output/playwright/setup-redesign');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(resolve(root, 'fixture-repository'), { recursive: true });
  const app = await electron.launch({
    args: ['.'],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: root,
      SYMPHONY_DATABASE_PATH: resolve(root, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(root, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(root, 'legacy'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '4000',
    },
  });
  try {
    const page = await prepareMainWindow(app);
    await page.evaluate(
      async (repositoryPath) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const settings = await api.request('settings.get', {});
        await api.request('settings.save', {
          settings: {
            ...settings,
            connections: [
              ...settings.connections,
              {
                id: 'setup-git',
                workspaceId: 'personal',
                kind: 'github',
                displayName: 'Fixture GitHub',
                hostname: 'github.com',
                gitProtocol: 'https',
              },
            ],
            repositoryBindings: [
              {
                id: 'setup-repo',
                workspaceId: 'personal',
                sourceControlConnectionId: 'setup-git',
                provider: 'simulated',
                displayName: 'Fixture repository',
                host: 'github.com',
                owner: 'fixture',
                name: 'repo',
                defaultBranch: 'main',
                localPath: repositoryPath,
                enabled: true,
              },
            ],
            workItemSources: [
              {
                id: 'setup-source',
                workspaceId: 'personal',
                connectionId: 'setup-git',
                provider: 'simulated',
                displayName: 'Fixture tickets',
                project: 'fixture',
                enabled: true,
              },
            ],
          },
        });
      },
      resolve(root, 'fixture-repository'),
    );
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((window) => !window.webContents.getURL().includes('/menu-bar'))
        ?.reload(),
    );
    await expect(page.getByTestId('home-view')).toBeVisible();
    const before = await page.evaluate(async () =>
      JSON.stringify(
        await (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'settings.get',
          {},
        ),
      ),
    );
    // act
    // `/main/setup` opens the `Build your project team` sheet in the Settings window.
    await page.evaluate(() => {
      location.hash = '/main/setup';
    });
    const isSettings = (candidate: { url(): string }) => candidate.url().includes('#/settings');
    await expect.poll(() => app.windows().some(isSettings)).toBe(true);
    const setupWindow = app.windows().find(isSettings)!;
    await expect(setupWindow.getByTestId('setup-apply')).toHaveJSProperty('disabled', false);
    const draft = await page.evaluate(async () =>
      JSON.stringify(
        await (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'settings.get',
          {},
        ),
      ),
    );
    expect(draft).toBe(before);
    await setupWindow.getByTestId('setup-apply').click();
    await expect(setupWindow.getByTestId('setup-first-analysis')).toBeVisible();
    await setupWindow.getByTestId('setup-analyse').click();
    // The started analysis closes the sheet and brings the main window forward.
    await expect(setupWindow.getByTestId('setup-apply')).toHaveCount(0);
    const activeAnalysis = await page.evaluate(async () => {
      const snapshot = await (
        window as unknown as { orchestration: IOrchestrationApi }
      ).orchestration.request('snapshot.get', {});
      const execution = snapshot.executions.find(
        (entry) => entry.kind === 'analysis' && entry.state === 'running',
      );
      if (!execution?.bindingSnapshot?.agentProfileId)
        throw new Error('The first analysis must still be running with a bound employee.');
      return {
        executionId: execution.id,
        agentId: execution.bindingSnapshot.agentProfileId,
        workItemId: execution.workItemId,
      };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByTestId('navigation-orbit').click();
    const orbit = page.getByTestId('orbit-canvas');
    await expect(orbit).toHaveAttribute('data-render-state', 'ready');
    await page.getByTestId('landscape-fit').click();
    await expect(orbit).toHaveAttribute('data-render-state', 'ready');
    await expect(orbit).toHaveAttribute('data-zoom-level', 'system');
    await expect(page.getByTestId('orbit-view').locator('symphony-agent-figure')).toHaveCount(0);
    await expect(page.getByTestId('employee-details')).toHaveCount(0);
    await expect(page.getByTestId('orbit-label-group:team')).toHaveCount(0);
    expect(
      await page.evaluate(async (executionId) => {
        const snapshot = await (
          window as unknown as { orchestration: IOrchestrationApi }
        ).orchestration.request('snapshot.get', {});
        return snapshot.executions.find((execution) => execution.id === executionId)?.state;
      }, activeAnalysis.executionId),
    ).toBe('running');
    await page.screenshot({ path: resolve(root, 'orbit-3d-running-analysis.png'), fullPage: true });
    // assert
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const snapshot = await (
            window as unknown as { orchestration: IOrchestrationApi }
          ).orchestration.request('snapshot.get', {});
          return snapshot.executions.some(
            (execution) => execution.kind === 'analysis' && execution.state === 'succeeded',
          );
        }),
      )
      .toBe(true);
    const configured = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const snapshot = await api.request('snapshot.get', {});
      return {
        version: settings.version,
        targets: settings.deliveryTargets,
        agent: settings.agentProfiles.find((agent) => agent.id.startsWith('setup-')),
        execution: snapshot.executions.find((execution) => execution.kind === 'analysis'),
      };
    });
    expect(configured.version).toBe(6);
    expect(configured.targets).toEqual([]);
    expect(configured.agent?.appearance).toBeDefined();
    expect(configured.execution?.bindingSnapshot?.agentProfileId).toBe(configured.agent?.id);
    await page.screenshot({ path: resolve(root, 'first-analysis.png'), fullPage: true });
  } finally {
    const window = app.windows().find((candidate) => !candidate.url().includes('/menu-bar'));
    await window
      ?.evaluate(async () => {
        await (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'lifecycle.active-operations.cancel',
          {},
        );
      })
      .catch(() => undefined);
    await app.close();
  }
});
