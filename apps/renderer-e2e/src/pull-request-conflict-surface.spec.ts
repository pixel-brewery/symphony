// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('surfaces a behind pull request, narrows it by base, and updates its branch', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `pull-request-conflict-${process.pid}`);
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
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '200',
      SYMPHONY_SIMULATED_PR_BASE_STATUS: 'behind',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    const workItemId = await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const snapshot = await api.request('snapshot.get', {});
      const item = snapshot.workItems.find((candidate) => candidate.externalId === '#142');
      if (!item) throw new Error('The simulated implementation work item is unavailable.');
      const workspaceId = settings.workspaces[0]!.id;
      const solutionSkill = await api.request('skills.save', {
        skill: {
          name: 'pull-request-conflict-solution',
          description: 'Implement a work item for conflict-surface acceptance.',
          instructions: 'Implement the requested work item inside the prepared worktree.',
          openaiYaml: '',
          files: [],
        },
      });
      const connection = {
        id: 'pull-request-conflict-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Conflict surface GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'pull-request-conflict-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'example/platform',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [...settings.connections, connection],
          repositoryBindings: [repository],
          deliveryContexts: [
            {
              id: 'pull-request-conflict-context',
              workspaceId,
              displayName: 'Conflict surface',
              workItemSourceIds: settings.workItemSources
                .filter((source) => source.workspaceId === workspaceId)
                .map((source) => source.id),
              repositoryBindingIds: [repository.id],
              ciBindingIds: [],
              agentTeamId: settings.agentTeams[0]!.id,
              defaultRepositoryBindingId: repository.id,
              enabled: true,
            },
          ],
          agentTeams: settings.agentTeams.map((team) => ({
            ...team,
            assignments: team.assignments.map((assignment) =>
              assignment.role === 'solution'
                ? { ...assignment, skillId: solutionSkill.id }
                : assignment,
            ),
          })),
        },
      });
      await api.request('repositories.prepare', { repositoryBindingId: repository.id });
      // Human Gate 1 releases the work item for technical work; no run may start before it.
      const gate = await api.request('workflow.decide', {
        workItemId: item.id,
        optionId: 'approve',
      });
      if (gate.record?.stageId !== 'qualified') {
        throw new Error('Human Gate 1 did not release the work item for technical work.');
      }
      await api.request('analysis.complete-manually', {
        workItemId: item.id,
        summary: 'The work item is ready for implementation.',
      });
      await api.request('solver.start', {
        simulateFailure: false,
        workItemId: item.id,
      });
      return item.id;
    }, workspace);

    await app.evaluate(
      ({ BrowserWindow }, rendererUrl) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === rendererUrl)
          ?.reload(),
      page.url(),
    );
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect
      .poll(
        () =>
          page.evaluate(async (id) => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.find(
              (execution) => execution.workItemId === id && execution.kind === 'solution',
            )?.state;
          }, workItemId),
        { timeout: 15_000 },
      )
      .toBe('succeeded');

    // Delivery happens through the board card, exactly as an operator would drive it.
    await page.getByTestId('navigation-board').click();
    const card = page.getByTestId(`board-item-${workItemId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId('task-create-pull-request')).toBeVisible();
    await page.getByTestId('task-create-pull-request').click();
    await expect(page.getByTestId('task-pull-request')).toBeVisible();
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);

    // The delivered pull request is listed with its behind-base qualification.
    await page.getByTestId('navigation-pull-requests').click();
    await expect(page).toHaveURL(/\/main\/pull-requests/u);
    await expect(page.getByTestId('pull-requests-view')).toHaveAttribute('aria-busy', 'false', {
      timeout: 15_000,
    });
    const pullRequestId = 'pull-request-conflict-repository:142';
    const row = page.getByTestId(`pull-request-${pullRequestId}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('#142');
    await expect(page.getByTestId(`pull-request-merge-${pullRequestId}`)).toContainText(
      'Behind base',
    );
    // The inspector of the selected pull request surfaces the base relationship with its fix.
    await row.click();
    const inspector = page.getByTestId('pull-request-inspector');
    await expect(inspector).toBeVisible();
    await expect(page.getByTestId('pull-request-behind-base')).toBeVisible();
    await expect(page.getByTestId('pull-request-update-branch')).toHaveJSProperty(
      'disabled',
      false,
    );

    // A branch behind its base needs action, so the segment lists it and keeps the choice in the URL.
    await expect(page.getByTestId('pull-requests-segment-needs-action')).toContainText(
      'Needs action · 1',
    );
    await page.getByTestId('pull-requests-segment-needs-action').click();
    await expect(page).toHaveURL(/view=needs-action/u);
    await expect(row).toBeVisible();
    await page.getByTestId('pull-requests-segment-drafts').click();
    await expect(row).toHaveCount(0);
    await expect(page.getByTestId('pull-requests-drafts-empty-state')).toBeVisible();
    await page.getByTestId('pull-requests-segment-open').click();
    await expect(page).not.toHaveURL(/view=/u);
    await expect(row).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'pull-request-behind-base.png'),
      fullPage: true,
    });

    // The base query parameter narrows the list the same way the home tiles hand it over.
    await page.evaluate(() => {
      window.location.hash = '/main/pull-requests?base=conflicting';
    });
    await expect(page).toHaveURL(/base=conflicting/u);
    await expect(row).toHaveCount(0);
    await page.evaluate(() => {
      window.location.hash = '/main/pull-requests?base=behind';
    });
    await expect(page).toHaveURL(/base=behind/u);
    await expect(row).toBeVisible();

    // The Base menu drives the same narrowing without a navigation. Its dropdown teleports the
    // options into an overlay, so they are only reachable page-wide while the menu is open.
    const filterMenu = page.getByTestId('pull-requests-filter');
    const baseFilter = page.getByTestId('pull-requests-base-filter');
    await filterMenu.click();
    await baseFilter.click();
    await page.getByText('Conflicting', { exact: true }).click();
    await expect(row).toHaveCount(0);
    const filteredEmptyState = page.getByTestId('pull-request-filters-empty-state');
    await expect(filteredEmptyState).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'pull-request-filter-empty-state.png'),
      fullPage: true,
    });
    await page.getByTestId('reset-pull-request-filters').click();
    await expect(page).not.toHaveURL(/base=/u);
    await expect(filteredEmptyState).toHaveCount(0);
    await expect(row).toBeVisible();

    // Updating the branch succeeds and clears the behind-base qualification.
    await row.click({ button: 'right' });
    const updateBranch = page.getByTestId(`pull-request-action-update-branch-${pullRequestId}`);
    await expect(updateBranch).toBeVisible();
    await expect(updateBranch).toHaveJSProperty('disabled', false);
    await updateBranch.click();
    await expect(row).toBeVisible();
    await expect(page.getByTestId(`pull-request-merge-${pullRequestId}`)).not.toContainText(
      'Behind base',
    );
    await expect(page.getByTestId('pull-request-behind-base')).toHaveCount(0);
    await row.click({ button: 'right' });
    await expect(updateBranch).toHaveJSProperty('disabled', true);
    await page.keyboard.press('Escape');
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'pull-request-branch-updated.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
