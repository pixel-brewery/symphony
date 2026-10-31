// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('links an implementation branch only after pull-request publication', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `branch-publication-${process.pid}`);
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
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '1200',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    const workItemId = await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const snapshot = await api.request('snapshot.get', {});
      const item = snapshot.workItems.find((candidate) => candidate.externalId === '#142');
      if (!item) throw new Error('The simulated implementation work item is unavailable.');
      const workspaceId = settings.workspaces[0]!.id;
      const solutionSkill = await api.request('skills.save', {
        skill: {
          name: 'branch-publication-solution',
          description: 'Implement a work item for branch-publication acceptance.',
          instructions: 'Implement the requested work item inside the prepared worktree.',
          openaiYaml: '',
          files: [],
        },
      });
      const connection = {
        id: 'branch-publication-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Branch publication GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'branch-publication-repository',
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
              id: 'branch-publication-context',
              workspaceId,
              displayName: 'Branch publication',
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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    const card = page.getByTestId(`board-item-${workItemId}`);
    await expect(card).toBeVisible();
    await card.click();
    const branch = page.getByTestId('task-solution-branch');
    await expect(branch).toBeVisible();
    expect(await branch.evaluate((element) => element.tagName)).toBe('MOSAIK-CHIP');
    expect(
      await branch.evaluate((element) => (element as HTMLElement & { href?: string }).href),
    ).toBeUndefined();
    await expect(branch.locator('xpath=following-sibling::mosaik-tooltip[1]')).toHaveJSProperty(
      'content',
      'Local branch · available on GitHub after creating the pull request',
    );
    await page.screenshot({
      path: resolve(outputDirectory, 'implementation-branch-local.png'),
      fullPage: true,
    });

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
    // Before delivery the card offers no pull-request entry, because there is none to act on.
    await page.getByTestId('task-drawer-header-close').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await card.click({ button: 'right' });
    await expect(page.getByTestId(`board-item-action-open-${workItemId}`)).toBeVisible();
    await expect(page.getByTestId(`board-item-action-pull-request-${workItemId}`)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await card.click();

    await expect(page.getByTestId('task-create-pull-request')).toBeVisible();
    await page.getByTestId('task-create-pull-request').click();
    await expect(page.getByTestId('task-pull-request')).toBeVisible();
    expect(await branch.evaluate((element) => element.tagName)).toBe('MOSAIK-BUTTON');
    expect(
      await branch.evaluate((element) => (element as HTMLElement & { href?: string }).href),
    ).toMatch(/^https:\/\/github\.com\/.+\/tree\/.+$/);
    await page.screenshot({
      path: resolve(outputDirectory, 'implementation-branch-published.png'),
      fullPage: true,
    });

    // A delivered card carries the pull request's own actions, so a run can be driven from the
    // board instead of only from the pull-request page.
    await page.getByTestId('task-drawer-header-close').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await card.click({ button: 'right' });
    const pullRequestEntry = page.getByTestId(`board-item-action-pull-request-${workItemId}`);
    await expect(pullRequestEntry).toBeVisible();
    await expect(pullRequestEntry).toContainText('#142');
    await pullRequestEntry.click();
    await expect(
      page.getByTestId(`board-item-pull-request-action-open-${workItemId}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`board-item-pull-request-action-remote-${workItemId}`),
    ).toContainText('Run remotely');
    await page.screenshot({
      path: resolve(outputDirectory, 'board-card-pull-request-actions.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
