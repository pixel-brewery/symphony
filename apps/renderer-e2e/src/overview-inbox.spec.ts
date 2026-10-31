// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type Page } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

/** Binds the simulated items' repository and an analysis skill, as an analysis run needs. */
async function seedAnalysisRepository(page: Page, localPath: string): Promise<void> {
  await page.evaluate(async (path) => {
    const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
    const settings = await api.request('settings.get', {});
    const workspaceId = settings.workspaces[0]!.id;
    const analysisSkill = await api.request('skills.save', {
      skill: {
        name: 'overview-inbox-analysis',
        description: 'Analysis skill for the Overview and Inbox journey.',
        instructions: 'Analyze the selected work item and return an implementation-ready plan.',
        openaiYaml: '',
        files: [],
      },
    });
    const connection = {
      id: 'overview-inbox-github',
      workspaceId,
      kind: 'github' as const,
      displayName: 'Overview inbox GitHub',
      hostname: 'github.com',
      gitProtocol: 'https' as const,
    };
    const repository = {
      id: 'overview-inbox-repository',
      workspaceId,
      sourceControlConnectionId: connection.id,
      displayName: 'example/platform',
      provider: 'github' as const,
      host: 'github.com',
      owner: 'example',
      name: 'platform',
      defaultBranch: 'main',
      localPath: path,
      enabled: true,
    };
    await api.request('settings.save', {
      settings: {
        ...settings,
        connections: [...settings.connections, connection],
        repositoryBindings: [...settings.repositoryBindings, repository],
        deliveryContexts: [
          {
            id: 'overview-inbox-context',
            workspaceId,
            displayName: 'Overview inbox',
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
  }, localPath);
}

test('Symphony opens on Overview, switches the reporting period and lists the Inbox', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `overview-inbox-${process.pid}`);
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
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '300',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));

    // Launch lands on Overview, titled in the toolbar with the workspace and the date.
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page).toHaveURL(/#\/main\/home/);
    await expect(page.getByTestId('window-title-text')).toContainText('Overview');
    await expect(page.getByTestId('window-subtitle')).toContainText(
      /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), /,
    );
    await expect(page.getByTestId('home-greeting')).toContainText(
      /Good (morning|afternoon|evening)/,
    );
    await expect(page.getByTestId('home-summary')).toBeVisible();
    await expect(page.getByTestId('home-sync')).toBeVisible();
    await expect(page.getByTestId('home-run-workflow')).toBeVisible();
    await expect(page.getByTestId('home-create-work-item')).toBeVisible();
    await expect(page.getByTestId('home-waiting-card')).toContainText('Waiting for you');
    await expect(page.getByTestId('home-pull-requests-card')).toContainText('Checks failing');
    await expect(page.getByTestId('home-production-card')).toContainText('Production');

    // Reporting starts on 7 days; figures without recorded history show a dash, never a zero.
    const week = page.getByTestId('home-reporting-period-7-days');
    const month = page.getByTestId('home-reporting-period-30-days');
    const quarter = page.getByTestId('home-reporting-period-quarter');
    await expect(week).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('home-tile-delivered-value')).toContainText('—');
    await expect(page.getByTestId('home-tile-lead-time-value')).toContainText('—');
    await expect(page.getByTestId('home-tile-agent-runs-value')).toContainText(/\d+/);
    await expect(page.getByTestId('home-runs-total')).toContainText('in 7 days');
    await expect(page.getByTestId('home-delivered-empty')).toBeVisible();
    await expect(page.getByTestId('home-tile-delivered-uncovered')).toContainText(
      'No stage changes recorded yet',
    );
    await expect(page.getByTestId('home-tile-workflow-success-value')).toContainText('—');
    // Without a GitHub account login, review requests cannot be attributed to the user.
    await expect(page.getByTestId('home-pull-requests-review-count')).toContainText('—');

    // The recorded history crosses the real process boundary, empty for a fresh workspace.
    const history = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
      return {
        stages: await api.request('workflow.stage-changes.list', { since }),
        runs: await api.request('ci.runs.history.list', { since }),
      };
    });
    expect(history.stages).toEqual({ changes: [], truncated: false });
    expect(history.runs).toEqual({ runs: [], truncated: false });

    // The period switch applies to everything below it.
    await month.click();
    await expect(month).toHaveJSProperty('isChecked', true);
    await expect(week).toHaveJSProperty('isChecked', false);
    await expect(page.getByTestId('home-runs-total')).toContainText('in 30 days');
    await quarter.click();
    await expect(quarter).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('home-runs-total')).toContainText('in the quarter');
    await expect(page.getByTestId('home-tile-delivered-value')).toContainText('—');

    // `Run workflow` opens Actions, where workflows are run.
    await page.getByTestId('home-run-workflow').click();
    await expect(page).toHaveURL(/#\/main\/actions/);
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();

    // An analysis that finishes gives the Inbox something to decide or report. The orchestrator
    // reads the seeded settings itself; the Inbox needs nothing from them.
    await seedAnalysisRepository(page, workspace);
    const executionId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const admission = await api.request('analyzer.start', { simulateFailure: false });
      if (admission.outcome !== 'started') throw new Error('The analysis was queued, not started.');
      return admission.execution.id;
    });
    await expect
      .poll(
        () =>
          page.evaluate(async (id) => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions.find((execution) => execution.id === id)?.state;
          }, executionId),
        { timeout: 30_000 },
      )
      .toBe('succeeded');

    // The Inbox: the filter segment, the grouped list and a detail pane with the five stages.
    await page.getByTestId('navigation-inbox').click();
    await expect(page.getByTestId('inbox-view')).toBeVisible();
    await expect(page.getByTestId('window-title-text')).toContainText('Inbox');
    await expect(page.getByTestId('inbox-filter-all')).toBeVisible();
    await expect(page.getByTestId('inbox-filter-decisions')).toContainText('Decisions');
    await expect(page.getByTestId('inbox-filter-updates')).toContainText('Updates');
    const entries = page.locator('[test-id^="inbox-entry-"]');
    await expect(entries.first()).toBeVisible({ timeout: 20_000 });
    await entries.first().click();
    await expect(page.getByTestId('inbox-detail')).toBeVisible();
    await expect(page.getByTestId('inbox-detail-status')).toBeVisible();
    for (const step of ['analysis', 'solution', 'implementation', 'checks', 'acceptance']) {
      await expect(page.getByTestId(`inbox-step-${step}`)).toBeVisible();
    }
    if (await page.getByTestId('inbox-continuation').isVisible()) {
      await expect(page.getByTestId('inbox-continuation')).toContainText(
        'How should this continue?',
      );
      await expect(page.getByTestId('inbox-continue')).toBeVisible();
      await expect(page.getByTestId('inbox-snooze')).toContainText('Snooze until tomorrow');
    }
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'inbox.png'),
      fullPage: true,
    });

    // The Decisions filter narrows the list; with nothing to decide it says so.
    await page.getByTestId('inbox-filter-decisions').click();
    await expect(page.getByTestId('inbox-filter-decisions')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('inbox-group-updates')).toHaveCount(0);
    await expect(
      page.getByTestId('inbox-group-decisions').or(page.getByTestId('inbox-empty')),
    ).toBeVisible();
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
