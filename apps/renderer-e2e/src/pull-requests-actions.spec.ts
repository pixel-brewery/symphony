// #region Imports

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('keeps pull requests and the run rail consistent with the Actions workspace', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(
    outputDirectory,
    `pull-requests-actions-configuration-${process.pid}`,
  );
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const workspaceDirectory = `personal-${createHash('sha256').update('personal').digest('hex').slice(0, 12)}`;
  const runtimeDatabasePath = resolve(
    configurationRoot,
    'workspaces',
    workspaceDirectory,
    'state.sqlite',
  );
  const launchOptions = {
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
  };
  // act
  let app = await electron.launch(launchOptions);

  // assert
  try {
    const configurationPage = await app.firstWindow();
    await expect(configurationPage.getByTestId('orbit-view')).toBeVisible();
    await configurationPage.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      const workspaceId = current.workspaces[0]!.id;
      const connection = {
        id: 'rail-actions-account',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Example GitHub',
        hostname: 'github.com',
        accountLogin: 'example-admin',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'rail-actions-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'example/product',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'example',
        name: 'product',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      const ciBinding = {
        id: 'rail-actions-ci',
        workspaceId,
        repositoryBindingId: repository.id,
        sourceControlConnectionId: connection.id,
        provider: 'github-actions' as const,
        displayName: 'Example Actions',
        enabled: true,
        agenticDeliveryEnabled: false,
      };
      await api.request('settings.save', {
        settings: {
          ...current,
          workspaces: current.workspaces.map((item) => ({ ...item, localCiEnabled: true })),
          connections: [...current.connections, connection],
          repositoryBindings: [...current.repositoryBindings, repository],
          ciBindings: [...current.ciBindings, ciBinding],
        },
      });
    }, workspace);
    await app.close();
    app = await electron.launch(launchOptions);
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await expect(page.getByTestId('presenter-route-scroll')).toHaveAttribute('aria-busy', 'false', {
      timeout: 15_000,
    });
    await expect(page.getByTestId('navigation-actions')).toBeVisible();

    await page.getByTestId('toggle-rail').click();
    await expect(page.getByTestId('rail-run-segment-agent-runs')).toHaveJSProperty(
      'isChecked',
      true,
    );
    await expect(page.getByTestId('rail-run-local-action:local-rail-e2e')).toHaveCount(0);
    await page.getByTestId('rail-run-segment-actions').click();
    const refreshActions = page.getByTestId('refresh-rail-actions');
    await expect(refreshActions).toHaveJSProperty('disabled', false);
    const ciRun = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const result = await api.request('ci.runs.refresh', {});
      return result.ciRuns.find((run) => run.status === 'succeeded');
    });
    expect(ciRun).toBeDefined();
    if (!ciRun) throw new Error('The simulated CI run is unavailable.');
    const localExecution = {
      id: 'local-rail-e2e',
      workspaceId: ciRun.workspaceId,
      repositoryBindingId: ciRun.repositoryBindingId,
      ciRunId: ciRun.id,
      runAttempt: 1,
      state: 'succeeded',
      startedAt: '2026-08-15T06:00:00.000Z',
      finishedAt: '2026-08-15T06:05:00.000Z',
      runner: {
        kind: 'managed-linux-vm',
        os: 'linux',
        architecture: 'arm64',
        label: 'runner-rail-e2e',
        imageVersion: 'ubuntu-24.04',
      },
    } as const;
    mkdirSync(dirname(runtimeDatabasePath), { recursive: true });
    const runtimeDatabase = new DatabaseSync(runtimeDatabasePath);
    runtimeDatabase
      .prepare(
        `INSERT INTO local_ci_executions(
          id, repository_binding_id, workspace_id, payload, started_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        localExecution.id,
        localExecution.repositoryBindingId,
        localExecution.workspaceId,
        JSON.stringify(localExecution),
        localExecution.startedAt,
      );
    runtimeDatabase.close();
    await refreshActions.click();
    const localRailRun = page.getByTestId('rail-run-local-action:local-rail-e2e');
    await expect(localRailRun).toContainText(ciRun.name, { timeout: 10_000 });
    await expect(
      page.getByTestId('rail-run-source-local-action:local-rail-e2e-github'),
    ).toContainText('GitHub · Succeeded');
    await expect(
      page.getByTestId('rail-run-source-local-action:local-rail-e2e-local-runner'),
    ).toContainText('Local runner · Succeeded');
    await page.screenshot({
      path: resolve(outputDirectory, 'run-rail-actions.png'),
      fullPage: true,
    });
    await localRailRun.click();
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();
    await expect(page.getByTestId('action-detail-source-github')).toContainText(
      'GitHub · Succeeded',
    );
    await expect(page.getByTestId('action-detail-source-local-runner')).toContainText(
      'Local runner · Succeeded',
    );
    await expect(page.getByTestId('action-detail-log')).toContainText('PR Quality');
    await expect(page.getByTestId('action-detail-log')).toContainText('Typecheck and test');
    const stepProtocol = page.getByTestId(
      `action-detail-step-protocol-${ciRun.id}:job:quality:step:test`,
    );
    await stepProtocol.click();
    await expect(stepProtocol).toContainText('completed successfully');
    const localDiagnostics = page.getByTestId(
      'action-detail-run-protocol-local-runner-diagnostics',
    );
    await localDiagnostics.click();
    await expect(localDiagnostics).toContainText('Swap: 4Gi');
    await page.screenshot({
      path: resolve(outputDirectory, 'action-detail-log.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('action-detail-drawer')).toHaveCount(0);
    await page.getByTestId('toggle-rail').click();

    const pullRequestsNavigation = page.getByTestId('navigation-pull-requests');
    await expect(pullRequestsNavigation).toContainText('Pull Requests');
    await pullRequestsNavigation.click();
    await expect(page).toHaveURL(/\/main\/pull-requests/u);
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();

    await page.getByTestId('navigation-actions').click();
    await expect(page).toHaveURL(/\/main\/actions/u);
    await expect(page.getByTestId('actions-view')).toBeVisible();

    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
