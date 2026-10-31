// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('Overview cards mirror the board and land on the filtered board', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `home-widgets-${process.pid}`);
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
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '1500',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(page.getByTestId('startup-splash')).toHaveCount(0);
    // Symphony opens on Overview.
    await expect(page.getByTestId('home-view')).toBeVisible();

    // The Board card has one bar per board column with its count, and nothing needs the user yet.
    const boardCard = page.getByTestId('home-board-card');
    await expect(boardCard).toContainText('0 need you');
    await expect(page.getByTestId('home-board-column-backlog')).toContainText('Backlog');
    await expect(page.getByTestId('home-board-column-qualified')).toContainText('Qualified');
    await expect(page.getByTestId('home-board-column-qualified')).toContainText('1');
    await expect(page.getByTestId('home-board-column-done')).toContainText('Done');
    await expect(page.getByTestId('home-pull-requests-card')).toContainText(
      'Waiting for your review',
    );
    await expect(page.getByTestId('home-waiting-empty')).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'home-overview.png'),
      fullPage: true,
    });

    // `New work item` raises the board's own new-work-item sheet, and the one-shot intent does not
    // stay in the URL where a reload would re-open the sheet.
    await page.getByTestId('home-create-work-item').click();
    await expect(page).toHaveURL(/\/main\/board(?!.*create)/);
    await expect(page.getByTestId('new-work-item-sheet')).toBeVisible();
    await page.getByTestId('issue-create-cancel').click();
    await expect(page.getByTestId('new-work-item-sheet')).toHaveCount(0);
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // A column bar lands on the board narrowed to exactly that column.
    await page.getByTestId('home-board-column-qualified').click();
    await expect(page).toHaveURL(/\/main\/board\?column=qualified/);
    await expect(page.getByTestId('board-column-qualified')).toBeVisible();
    await expect(page.getByTestId('board-column-backlog')).toHaveCount(0);

    // A failing run needs an assigned analysis skill and a repository binding that
    // resolves the simulated items' "example/platform"; both go through the typed API.
    await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const workspaceId = settings.workspaces[0]!.id;
      const analysisSkill = await api.request('skills.save', {
        skill: {
          name: 'home-widgets-analysis',
          description: 'Analysis skill for the home widget slice.',
          instructions: 'Analyze the selected work item and return an implementation-ready plan.',
          openaiYaml: '',
          files: [],
        },
      });
      const connection = {
        id: 'home-widgets-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Home widgets GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'home-widgets-repository',
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
          repositoryBindings: [...settings.repositoryBindings, repository],
          deliveryContexts: [
            {
              id: 'home-widgets-context',
              workspaceId,
              displayName: 'Home widgets',
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
              assignment.role === 'analysis'
                ? { ...assignment, skillId: analysisSkill.id }
                : assignment,
            ),
          })),
        },
      });
      await api.request('repositories.prepare', { repositoryBindingId: repository.id });
    }, workspace);

    // The only analyzable item is #138 in Qualified; a failed analysis makes it need the user.
    const failedExecutionId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const admission = await api.request('analyzer.start', { simulateFailure: true });
      if (admission.outcome !== 'started') throw new Error('The analysis was queued, not started.');
      return admission.execution.id;
    });
    await expect
      .poll(
        () =>
          page.evaluate(async (executionId) => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.find((execution) => execution.id === executionId)?.state;
          }, failedExecutionId),
        { timeout: 20_000 },
      )
      .toBe('failed');

    // The failed run is the one work item that needs the user, as on the Board.
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(boardCard).toContainText('1 need you');

    // The start page never scrolls sideways, at the design size and at laptop sizes and zoom.
    for (const size of [
      { width: 1440, height: 900, zoom: 1 },
      { width: 1040, height: 700, zoom: 1 },
      { width: 1040, height: 700, zoom: 1.25 },
      { width: 780, height: 620, zoom: 1 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, { rendererUrl, size }) => {
          const window = BrowserWindow.getAllWindows().find(
            (candidate) => candidate.webContents.getURL() === rendererUrl,
          );
          if (!window) throw new Error('The Overview window is missing.');
          window.setContentSize(size.width, size.height);
          window.webContents.setZoomFactor(size.zoom);
        },
        { rendererUrl: page.url(), size },
      );
      await expect
        .poll(() =>
          page
            .getByTestId('presenter-route-scroll')
            .evaluate((scroll) => scroll.scrollWidth - scroll.clientWidth),
        )
        .toBeLessThanOrEqual(0);
    }
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'home-overview-compact.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
