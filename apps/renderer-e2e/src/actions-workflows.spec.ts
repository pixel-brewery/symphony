// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { FlowElement } from '@pixel-brewery/mosaik-elements-foundation/components/flow';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import type { BrowserWindow } from 'electron';
import { prepareMainWindow } from './prepareMainWindow';
import { closeSettings } from './closeSettings';

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
    await expect(page.getByTestId('action-detail-cancel-remote')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('action-detail-drawer')).toHaveCount(0);

    // A finished run opens its log directly and leaves All runs selected behind it.
    await page.getByTestId('actions-history-actions-ci:7002').click();
    await expect(page.getByTestId('action-detail-drawer')).toBeVisible();
    await expect(page.getByTestId('action-detail-job-actions-ci:7002:job:quality')).toBeVisible();
    await expect(page.getByTestId('actions-scope-all')).toHaveAttribute('aria-current', 'page');
    await page.getByTestId('action-detail-close').click();
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
    const queuedWorkflowRun = page.getByTestId('action-run-actions-ci:7001');
    await queuedWorkflowRun.click({ button: 'right' });
    await expect(page.getByTestId('actions-run-cancel')).toBeVisible();
    await expect(page.getByTestId('actions-run-rerun')).toHaveCount(0);
    await expect(page.getByTestId('action-detail-drawer')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('actions-run-cancel')).toBeHidden();
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
    const toolbar = page.getByTestId('action-detail-toolbar');
    await expect(toolbar.getByTestId('action-detail-open-run')).toBeVisible();
    await expect(toolbar.getByTestId('action-detail-run-remote')).toBeVisible();
    await expect(toolbar.getByTestId('action-detail-close')).toBeVisible();
    await expect(page.getByTestId('ci-job-minimap')).toHaveCount(0);
    await expect(page.getByTestId('ci-job-controls')).toHaveCount(0);
    await expect(page.getByTestId('action-detail-graph-frame')).toHaveCSS('height', '192px');
    // The link also selects the run's workflow and the run behind the drawer.
    await expect(page.getByTestId('actions-workflow-title')).toHaveJSProperty('text', 'PR Quality');
    await expect(page.getByTestId(`action-run-${runId}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId(/^ci-graph-job-/u)).toHaveCount(5);
    await expect(page.getByTestId(/^ci-graph-dependency-/u)).toHaveCount(4);
    await expect
      .poll(() => flow.evaluate((element) => ((element as FlowElement).bounds?.width ?? 0) > 520))
      .toBe(true);
    await expect
      .poll(() => flow.evaluate((element) => (element as FlowElement).zoom))
      .toBeCloseTo(0.8, 2);
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

    // The native Home command fits all jobs; activation still opens the same job log.
    await flow.locator('[part=viewport]').press('Home');
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
    // A long workflow history stays bounded and exposes each run's full output through its drawer.
    await app.close();
    app = await electron.launch({
      ...launchOptions,
      env: {
        ...launchOptions.env,
        SYMPHONY_SIMULATED_CI_LAYOUT_FIXTURE: '1',
        SYMPHONY_SIMULATED_CI_JOB_COUNT: '30',
      },
    });
    // The preserved profile restores its last screen, Actions, rather than a fresh Overview.
    const layoutPage = await prepareMainWindow(app, 'actions-view');
    layoutPage.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    const layoutWindow = await app.browserWindow(layoutPage);
    await layoutPage.getByTestId('navigation-settings').click();
    await layoutPage.getByTestId('global-settings-section-appearance').click();
    await layoutPage.getByTestId('theme-dark').click();
    await closeSettings(layoutPage);
    await expect(layoutPage.locator('html')).toHaveAttribute('theme-mode', 'dark');
    await layoutPage.getByTestId('actions-scope-all').click();
    await expect(layoutPage.getByTestId('actions-history-table')).toBeVisible();
    await expect(layoutPage.getByTestId('actions-all-runs-header')).toBeInViewport({ ratio: 1 });
    await expect(layoutPage.getByTestId('actions-history')).toBeInViewport({ ratio: 1 });

    // The status point is part of the same selectable item and tooltip anchor.
    const failedWorkflow = layoutPage.getByTestId('actions-workflow-actions-ci:102');
    const failedPoint = layoutPage.getByTestId('actions-workflow-health-actions-ci:102');
    const workflowTooltip = layoutPage.getByTestId('actions-workflow-tooltip-actions-ci:102');
    await failedPoint.hover();
    await expect(workflowTooltip).toHaveJSProperty('isOpen', true);
    await expect(workflowTooltip).toHaveJSProperty('content', 'Deploy Dev');
    await failedPoint.click();
    await expect(layoutPage).toHaveURL(/workflow=actions-ci(?::|%3A)102/u);
    await expect(failedWorkflow).toHaveAttribute('aria-current', 'page');
    await expect(failedWorkflow).toHaveAccessibleName('Deploy Dev · Latest run failed');
    const itemBounds = await failedWorkflow.boundingBox();
    const pointBounds = await failedPoint.boundingBox();
    expect(itemBounds).not.toBeNull();
    expect(pointBounds).not.toBeNull();
    if (!itemBounds || !pointBounds) throw new Error('Workflow selection is not rendered.');
    expect(pointBounds.x).toBeGreaterThanOrEqual(itemBounds.x);
    expect(pointBounds.x + pointBounds.width).toBeLessThanOrEqual(itemBounds.x + itemBounds.width);

    await layoutPage.getByTestId('refresh-actions').focus();
    await expect(workflowTooltip).toHaveJSProperty('isOpen', false);
    await failedWorkflow.focus();
    await expect(workflowTooltip).toHaveJSProperty('isOpen', true);
    await layoutPage.keyboard.press('Escape');
    await expect(workflowTooltip).toHaveJSProperty('isOpen', false);

    const table = layoutPage.getByTestId('actions-workflow-table');
    const tableHeader = layoutPage.getByTestId('actions-workflow-table-header');
    const drawer = layoutPage.getByTestId('action-detail-drawer');
    const failedRun = layoutPage.getByTestId('action-run-actions-ci:7001');
    const olderRun = layoutPage.getByTestId('action-run-actions-ci:7004');
    const lastRun = layoutPage.getByTestId('action-run-actions-ci:7358');
    const diagnosis = layoutPage.getByTestId('actions-diagnosis');
    const diagnosisHeading = diagnosis.locator('[part~="heading"]');
    const diagnosisContent = layoutPage.getByTestId('actions-diagnosis-content');
    await expect(layoutPage.getByTestId('actions-run-log-region')).toHaveCount(0);
    await expect(diagnosis).toHaveJSProperty('variant', 'highlight');
    await expect(diagnosis).toHaveJSProperty('isExpanded', false);
    await expect(diagnosisContent).toBeHidden();

    await failedRun.click();
    await expect(drawer).toBeVisible();
    const graphSkeleton = layoutPage.getByTestId('action-detail-graph-skeleton');
    await expect(graphSkeleton).toBeVisible();
    const skeletonBounds = await graphSkeleton.boundingBox();
    const skeletonHeading = await drawer.getByTestId('action-detail-log-heading').boundingBox();
    await layoutPage.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-run-skeleton-dark.png'),
    });
    const loadedFlow = drawer.getByTestId('ci-job-flow');
    await expect(loadedFlow).toBeVisible();
    const graphFrame = drawer.getByTestId('action-detail-graph-frame');
    const loadedBounds = await graphFrame.boundingBox();
    await expect(graphFrame).toHaveCSS('border-top-style', 'solid');
    await expect(graphFrame).toHaveCSS('border-top-width', '1px');
    const viewport = loadedFlow.locator('[part="viewport"]');
    await expect(viewport).toHaveCSS('background-image', /^radial-gradient/u);
    const loadedHeading = await drawer.getByTestId('action-detail-log-heading').boundingBox();
    expect(skeletonBounds?.height).toBeCloseTo(loadedBounds?.height ?? 0, 0);
    expect(skeletonHeading?.y).toBeCloseTo(loadedHeading?.y ?? 0, 0);
    await expect(
      layoutPage.getByTestId('action-detail-job-actions-ci:7001:job:quality'),
    ).toBeVisible();
    await expect(
      layoutPage.getByTestId('action-detail-step-actions-ci:7001:job:quality:step:test'),
    ).toBeVisible();
    await expect(
      layoutPage.getByTestId('action-detail-step-protocol-actions-ci:7001:job:quality:step:test'),
    ).toContainText('Verification output 40');
    const openRun = layoutPage.getByTestId('action-detail-open-run');
    const openRunTooltip = layoutPage.getByTestId('action-detail-open-run-tooltip');
    await openRun.hover();
    await expect(openRunTooltip).toHaveJSProperty('isOpen', true);
    await expect(openRunTooltip).toHaveJSProperty('content', 'Open run in GitHub');
    await layoutPage.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-run-drawer-dark.png'),
    });
    await layoutPage.getByTestId('action-detail-log-heading').hover();
    await expect(openRunTooltip).toHaveJSProperty('isOpen', false);
    await openRun.focus();
    await expect(openRunTooltip).toHaveJSProperty('isOpen', true);
    await layoutPage.getByTestId('action-detail-close').focus();
    await expect(layoutPage.getByTestId('action-detail-close-tooltip')).toHaveJSProperty(
      'isOpen',
      true,
    );
    await layoutPage.getByTestId('action-detail-close').click();
    await expect(drawer).toHaveCount(0);
    await expect(failedRun).toHaveAttribute('aria-selected', 'true');

    await olderRun.click({ button: 'right' });
    const contextLog = layoutPage.getByTestId('actions-run-log');
    await expect(contextLog).toBeVisible();
    await expect(layoutPage.getByTestId('actions-run-open')).toBeVisible();
    await expect(layoutPage.getByTestId('actions-run-rerun')).toBeVisible();
    await expect(layoutPage.getByTestId('actions-run-cancel')).toHaveCount(0);
    await expect(drawer).toHaveCount(0);
    await layoutPage.keyboard.press('Escape');
    await expect(contextLog).toBeHidden();
    await expect(drawer).toHaveCount(0);

    await olderRun.press('Shift+F10');
    await contextLog.click();
    await expect(drawer).toBeVisible();
    await expect(
      layoutPage.getByTestId('action-detail-job-actions-ci:7004:job:quality'),
    ).toBeVisible();
    await layoutPage.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    await failedRun.focus();
    await failedRun.press('Enter');
    await expect(drawer).toBeVisible();
    await expect(
      layoutPage.getByTestId('action-detail-job-actions-ci:7001:job:quality'),
    ).toBeVisible();
    await layoutPage.getByTestId('action-detail-close').click();
    await expect(drawer).toHaveCount(0);

    for (const size of [
      { width: 1024, height: 674 },
      { width: 960, height: 674 },
    ]) {
      // These native sizes fit the visible macOS runner as well as local hidden-window runs.
      await layoutWindow.evaluate((window: BrowserWindow, dimensions) => {
        window.setContentSize(dimensions.width, dimensions.height);
      }, size);
      await layoutPage.waitForFunction(
        ({ width, height }) => window.innerWidth === width && window.innerHeight === height,
        size,
      );
      await expect(table).toBeInViewport({ ratio: 1 });
      await expect(layoutPage.getByTestId('actions-workflow-header')).toBeInViewport({ ratio: 1 });
      await expect(diagnosis).toBeInViewport({ ratio: 1 });
      await diagnosisHeading.press('Enter');
      await expect(diagnosis).toHaveJSProperty('isExpanded', true);
      await expect(diagnosisContent).toBeVisible();
      await expect(diagnosisContent.getByTestId('actions-fix-with-ai-reason')).toBeVisible();
      if (size.width === 1024) {
        await layoutPage.screenshot({
          animations: 'disabled',
          path: resolve(outputDirectory, 'actions-diagnosis-dark.png'),
        });
      }
      await expect(layoutPage.getByTestId('actions-fix-with-ai')).toBeVisible();
      await layoutPage.getByTestId('actions-toggle-diagnosis').click();
      await expect(diagnosis).toHaveJSProperty('isExpanded', false);
      await expect(diagnosisContent).toBeHidden();
    }

    const revisionBounds = await layoutPage
      .getByTestId('actions-workflow-revision-heading')
      .boundingBox();
    expect(revisionBounds?.width ?? 0).toBeGreaterThanOrEqual(180);
    const horizontalScroll = await table.evaluate((element) => {
      const viewport = element.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]');
      if (!viewport) throw new Error('The table does not expose its scroll viewport.');
      viewport.scrollLeft = viewport.scrollWidth;
      const result = {
        left: viewport.scrollLeft,
        width: viewport.clientWidth,
        content: viewport.scrollWidth,
      };
      viewport.scrollLeft = 0;
      return result;
    });
    expect(horizontalScroll.content).toBeGreaterThan(horizontalScroll.width);
    expect(horizontalScroll.left).toBeGreaterThan(0);
    // Declarative Mosaik Table keeps every row in the DOM and projects only its current window.
    await expect(lastRun).toHaveCount(1);
    await expect(lastRun).toBeHidden();
    const headerBefore = await tableHeader.boundingBox();
    const scrollResult = await table.evaluate((element) => {
      const viewport = element.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]');
      if (!viewport) throw new Error('The table does not expose its scroll viewport.');
      viewport.scrollTop = viewport.scrollHeight;
      return {
        top: viewport.scrollTop,
        height: viewport.clientHeight,
        content: viewport.scrollHeight,
      };
    });
    expect(scrollResult.content).toBeGreaterThan(scrollResult.height);
    expect(scrollResult.top).toBeGreaterThan(0);
    await expect(lastRun).toBeInViewport();
    await expect(failedRun).toBeHidden();
    await expect(tableHeader).toBeInViewport();
    const headerAfter = await tableHeader.boundingBox();
    if (!headerBefore || !headerAfter) throw new Error('The table header is not rendered.');
    expect(Math.abs(headerBefore.y - headerAfter.y)).toBeLessThanOrEqual(2);
    await expect(diagnosis).toBeInViewport({ ratio: 1 });
    await expect(layoutPage.getByTestId('actions-workflow-header')).toBeInViewport({ ratio: 1 });
    await layoutPage.screenshot({
      animations: 'disabled',
      path: resolve(outputDirectory, 'actions-workflow-bounded-layout.png'),
      fullPage: true,
    });

    const disabledWorkflow = layoutPage.getByTestId('actions-workflow-actions-ci:103');
    const disabledTooltip = layoutPage.getByTestId('actions-workflow-tooltip-actions-ci:103');
    await disabledWorkflow.hover();
    await expect(disabledTooltip).toHaveJSProperty('isOpen', true);
    await expect(disabledTooltip).toHaveJSProperty(
      'content',
      'Cache Maintenance with a deliberately long workflow name for layout inspection · Disabled on GitHub',
    );
    await disabledWorkflow.click();
    await expect(diagnosis).toHaveCount(0);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
