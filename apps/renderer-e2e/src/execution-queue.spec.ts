// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expect,
  test,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

const outputDirectory = resolve('output/playwright');

/**
 * One execution slot, two analysable work items, and autonomous work switched off: the smallest
 * setup in which the queue is the only thing that can carry the second decision.
 */
async function launchWithSingleSlot(name: string): Promise<ElectronApplication> {
  const configurationRoot = resolve(outputDirectory, `${name}-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
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
      // The first run must still hold the only slot while the second one is queued.
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '30000',
    },
  });

  const page = await mainWindow(app);
  await expect(page.getByTestId('orbit-view')).toBeVisible();
  await page.getByTestId('navigation-home').click();
  await expect(page.getByTestId('home-view')).toBeVisible();
  await page.evaluate(async (localPath) => {
    const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
    const settings = await api.request('settings.get', {});
    const workspaceId = settings.workspaces[0]!.id;
    const analysisSkill = await api.request('skills.save', {
      skill: {
        name: 'execution-queue-analysis',
        description: 'Analyze a work item while the execution queue is exercised.',
        instructions: 'Analyze the selected work item and return an implementation-ready plan.',
        openaiYaml: '',
        files: [],
      },
    });
    const connection = {
      id: 'execution-queue-github',
      workspaceId,
      kind: 'github' as const,
      displayName: 'Execution queue GitHub',
      hostname: 'github.com',
      gitProtocol: 'https' as const,
    };
    const repository = {
      id: 'execution-queue-repository',
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
        runtime: {
          ...settings.runtime,
          maxParallelExecutions: 1,
          autonomousExecutionEnabled: false,
        },
        connections: [...settings.connections, connection],
        repositoryBindings: [repository],
        deliveryContexts: [
          {
            id: 'execution-queue-context',
            workspaceId,
            displayName: 'Execution queue',
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
    // Only the Qualified stage runs analysis, so the second candidate is moved there first.
    const snapshot = await api.request('snapshot.get', {});
    const qualified = snapshot.boardColumns.find((column) => column.stageId === 'qualified');
    if (!qualified) throw new Error('The simulated board has no Qualified column.');
    await api.request('work-items.move', {
      workItemId: 'work-item-142',
      boardColumnId: qualified.id,
    });
  }, resolve('.'));

  const admissions = await page.evaluate(async () => {
    const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
    const first = await api.request('analyzer.start', {
      simulateFailure: false,
      workItemId: 'work-item-138',
    });
    const second = await api.request('analyzer.start', {
      simulateFailure: false,
      workItemId: 'work-item-142',
    });
    return [first.outcome, second.outcome];
  });
  // The second decision is kept rather than refused for lack of capacity.
  expect(admissions).toEqual(['started', 'queued']);
  return app;
}

/**
 * The shell window. Symphony also opens the menu-bar panel, and either window may be the first
 * one Playwright sees, so the shell is identified by a control only the shell has.
 */
async function mainWindow(app: ElectronApplication): Promise<Page> {
  await app.firstWindow();
  let shell: Page | undefined;
  await expect
    .poll(
      async () => {
        for (const candidate of app.windows()) {
          if (await candidate.getByTestId('toggle-rail').count()) {
            shell = candidate;
            return true;
          }
        }
        return false;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  if (!shell) throw new Error('The Symphony shell window never opened.');
  return shell;
}

/** Cancels this fixture's active operations so native shutdown never waits on a test run. */
async function cancelRunningExecution(app: ElectronApplication): Promise<void> {
  const page = await mainWindow(app);
  await page.evaluate(async () => {
    const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
    await api.request('lifecycle.active-operations.cancel', {});
  });
}

test('shows a step waiting for an execution slot in the rail and withdraws it again', async () => {
  // act
  // arrange
  const app = await launchWithSingleSlot('execution-queue-rail');

  // assert
  try {
    const page = await mainWindow(app);
    await app.evaluate(
      ({ BrowserWindow }, rendererUrl) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === rendererUrl)
          ?.reload(),
      page.url(),
    );
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('toggle-rail').click();
    await page.getByTestId('rail-run-segment-agent-runs').click();

    const queuedRun = page.getByTestId('rail-run-queued:work-item-142');
    await expect(queuedRun).toBeVisible();
    await expect(queuedRun).toContainText('#142');
    await expect(queuedRun).toContainText('Queued');
    const withdraw = page.getByTestId('rail-run-dequeue-queued:work-item-142');
    await expect(withdraw).toBeVisible();
    await page.getByTestId('workspace-rail').screenshot({
      path: resolve(outputDirectory, 'execution-queue-rail.png'),
    });

    await withdraw.click();

    await expect(queuedRun).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          const state = await api.request('execution-state.get', {});
          return state.executionQueue.length;
        }),
      )
      .toBe(0);
  } finally {
    await cancelRunningExecution(app);
    await app.close();
  }
});

test('starts the waiting step itself when a slot frees and autonomous work is off', async () => {
  const app = await launchWithSingleSlot('execution-queue-drain');

  try {
    const page = await mainWindow(app);
    await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const state = await api.request('execution-state.get', {});
      const running = state.executions.find(
        (execution) => execution.workItemId === 'work-item-138',
      );
      if (!running) throw new Error('The first analysis never started.');
      await api.request('execution.cancel', { executionId: running.id });
    });

    // Nothing else is scheduled: releasing the slot is what starts the queued step.
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
          const state = await api.request('execution-state.get', {});
          return {
            queued: state.executionQueue.length,
            started: state.executions.some((execution) => execution.workItemId === 'work-item-142'),
          };
        }),
      )
      .toEqual({ queued: 0, started: true });
  } finally {
    await cancelRunningExecution(app);
    await app.close();
  }
});
