// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { FlowElement } from '@pixel-brewery/mosaik-elements-foundation/components/flow';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('navigates repository workflows and exposes remote and managed-local dispatch', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `actions-workflows-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
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
      SYMPHONY_SIMULATED_CI_JOB_COUNT: '5',
    },
  };
  // act
  let app = await electron.launch(launchOptions);

  // assert
  try {
    const configurationPage = await app.firstWindow();
    await expect(configurationPage.getByTestId('home-view')).toBeVisible();
    await configurationPage.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      const workspaceId = current.workspaces[0]!.id;
      const connection = {
        id: 'actions-account',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Example GitHub',
        hostname: 'github.com',
        accountLogin: 'example-admin',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'actions-repository',
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
        id: 'actions-ci',
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
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('presenter-route-scroll')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30_000,
    });
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            return (await api.request('ci.runs.refresh', {})).ciWorkflows.length;
          }),
        { timeout: 15_000 },
      )
      .toBe(3);

    await page.getByTestId('navigation-actions').click();
    await expect(page).toHaveURL(/\/main\/actions/u);
    // Actions opens on `All runs`: every running and queued run, then the finished history.
    await expect(page.getByTestId('actions-scope-all')).toHaveAttribute('aria-current', 'page', {
      timeout: 15_000,
    });
    await expect(page.getByTestId('window-title-text')).toHaveJSProperty('text', 'Actions');
    await expect(page.getByTestId('actions-running-heading')).toHaveJSProperty(
      'text',
      'Running now · 1',
    );
    const queuedRun = page.getByTestId('actions-running-actions-ci:7001');
    await expect(queuedRun).toContainText('Deploy Dev');
    await expect(page.getByTestId('actions-running-cancel-actions-ci:7001')).toBeVisible();
    await expect(page.getByTestId('actions-history-actions-ci:7000')).toBeVisible();
    await expect(page.getByTestId('actions-history-actions-ci:7002')).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-all-runs.png'),
      fullPage: true,
    });

    // `View log` opens the Action drawer of the run without leaving `All runs`.
    await page.getByTestId('actions-running-log-actions-ci:7001').click();
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('action-detail-drawer')).toHaveCount(0);

    const filterMenu = page.getByTestId('actions-filter');
    await expect(filterMenu).toHaveAttribute('has-icon', '');
    await filterMenu.click();
    await expect(page.getByTestId('actions-status-filter')).toBeVisible();
    await expect(page.getByTestId('actions-author-filter')).toBeVisible();
    await expect(page.getByTestId('actions-sort')).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-filter-menu.png'),
      fullPage: true,
    });
    await page.getByTestId('actions-status-filter').click();
    const allStatusesOption = page.getByLabel('All statuses');
    await expect(allStatusesOption).toBeVisible();
    await allStatusesOption.click();
    await expect(filterMenu).toHaveJSProperty('isDropDownOpen', false);

    // The workflow list orders its entries by state and selects a workflow into the URL.
    await expect(page.getByTestId('actions-workflow-actions-ci:101')).toContainText('PR Quality');
    await expect(page.getByTestId('actions-workflow-health-actions-ci:101')).toHaveAttribute(
      'aria-label',
      'Latest run passed',
    );
    await page.getByTestId('actions-workflow-actions-ci:102').click();
    await expect(page).toHaveURL(/workflow=actions-ci(?::|%3A)102/u);
    await expect(page.getByTestId('actions-workflow-title')).toHaveJSProperty('text', 'Deploy Dev');
    await expect(page.getByTestId('actions-workflow-path')).toHaveJSProperty(
      'text',
      '.github/workflows/deploy.yml',
    );
    await expect(page.getByTestId('action-run-actions-ci:7001')).toBeVisible();
    await expect(page.getByTestId('workflow-dispatch-available')).toBeVisible();
    await page.getByTestId('workflow-dispatch-remote-actions-ci:102').click();
    await expect(page.getByTestId('workflow-dispatch-ref').locator('input')).toHaveValue('main');
    await page.getByTestId('workflow-dispatch-ref').locator('input').fill('release/preview');
    await page.getByTestId('workflow-dispatch-confirm').click();
    await expect(page.getByTestId('notification-success').last()).toContainText(
      'started on GitHub Actions',
    );
    await expect(page.getByTestId('workflow-dispatch-local-actions-ci:102')).toHaveJSProperty(
      'disabled',
      true,
    );
    await page.getByTestId('rail-run-segment-actions').click();
    await expect(page.getByTestId('run-panel')).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-manual-run-rail.png'),
      fullPage: true,
    });

    // Back returns to `All runs`; Forward restores the workflow.
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('actions-scope-all')).toHaveAttribute('aria-current', 'page');
    await page.getByTestId('navigate-forward').click();
    await expect(page.getByTestId('actions-workflow-title')).toHaveJSProperty('text', 'Deploy Dev');

    // The palette's `Run <workflow> on GitHub` opens the same confirmation once.
    await page.evaluate(() => {
      location.hash = '/main/actions?workflow=actions-ci%3A101&dispatch=github';
    });
    await expect(page.getByTestId('workflow-dispatch-proposal')).toBeVisible();
    await expect(page.getByTestId('actions-workflow-title')).toHaveJSProperty('text', 'PR Quality');
    await expect(page).not.toHaveURL(/dispatch=/u);
    await page.getByTestId('workflow-dispatch-cancel').click();
    await expect(page.getByTestId('workflow-dispatch-proposal')).toHaveCount(0);

    const runId = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return (await api.request('ci.runs.refresh', {})).ciRuns[0]!.id;
    });
    await page.evaluate((id) => {
      location.hash = '/main/actions?run=' + encodeURIComponent(id);
    }, runId);
    const flow = page.getByTestId('ci-job-flow');
    await expect(flow).toBeVisible();
    // The link also selects the run's workflow and the run behind the drawer.
    await expect(page.getByTestId('actions-workflow-title')).toHaveJSProperty('text', 'PR Quality');
    await expect(page.getByTestId(`action-run-${runId}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId(/^ci-graph-job-/u)).toHaveCount(5);
    await expect(page.getByTestId(/^ci-graph-dependency-/u)).toHaveCount(4);
    await expect
      .poll(() => flow.evaluate((element) => ((element as FlowElement).bounds?.width ?? 0) > 520))
      .toBe(true);
    await expect(flow).toHaveJSProperty('errors', []);
    await page.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-flow.png'),
      fullPage: true,
    });
    await flow.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-flow-diagram.png'),
    });

    // Keyboard activation opens the same job log as a pointer activation.
    const job = page.getByTestId('ci-open-job-job-1');
    await job.focus();
    await job.press('Enter');
    await expect(page.getByTestId(`action-detail-job-${runId}:job:job-1`)).toBeInViewport();
    await page
      .getByTestId('ci-matrix-quality')
      .getByRole('button', { name: 'Matrix executions (2)' })
      .click();
    await page.getByTestId(`ci-matrix-run-${runId}:job:quality`).click();
    await expect(page.getByTestId(`action-detail-job-${runId}:job:quality`)).toBeInViewport();
    await job.click();
    await expect(page.getByTestId(`action-detail-job-${runId}:job:job-1`)).toBeInViewport();
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
