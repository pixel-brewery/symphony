// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('reports each work-item problem in a complete banner that scrolls with the drawer', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(
    outputDirectory,
    `work-item-health-configuration-${process.pid}`,
  );
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
    await expect(page.getByTestId('orbit-view')).toBeVisible();
    await page.getByTestId('navigation-home').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const workspaceId = settings.workspaces[0]!.id;
      const connection = {
        id: 'work-item-health-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Work item health GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'work-item-health-repository',
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
              id: 'work-item-health-context',
              workspaceId,
              displayName: 'Work item health',
              workItemSourceIds: [],
              repositoryBindingIds: [repository.id],
              ciBindingIds: [],
              agentTeamId: settings.agentTeams[0]!.id,
              defaultRepositoryBindingId: repository.id,
              enabled: true,
            },
          ],
        },
      });
    }, workspace);
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);

    // The simulated board ships items without estimate, target date or priority. Those are
    // optional planning values nobody is obliged to fill in, so neither the card nor the
    // drawer may raise them: an unset optional field is not a finding.
    const indicator = page.getByTestId('board-item-health-work-item-142');
    await expect(indicator).toHaveCount(0);

    await page.getByTestId('board-item-work-item-142').click();
    let health = page.getByTestId('task-health');
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(health).toHaveCount(0);
    await page.getByTestId('task-drawer-header-close').click();

    // Create three independent, real findings without changing the shared simulated fixture:
    // a contradictory closing label, a missing assistance field and, after the UI move below,
    // an implementation stage with no completed analysis.
    await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const item = await api.request('work-items.detail', { workItemId: 'work-item-142' });
      await api.request('work-items.update', {
        workItemId: item.id,
        item: {
          ...(item.workspaceId ? { workspaceId: item.workspaceId } : {}),
          ...(item.sourceId ? { sourceId: item.sourceId } : {}),
          ...(item.workItemType ? { workItemType: item.workItemType } : {}),
          ...(item.revision === undefined ? {} : { revision: item.revision }),
          title: item.title,
          body: item.body,
          repository: item.repository,
          ...(item.repositoryBindingIds ? { repositoryBindingIds: item.repositoryBindingIds } : {}),
          projectFields: (item.projectFields ?? []).map((field) =>
            field.fieldId === 'field-assistant-phase' && field.type === 'single-select'
              ? { ...field, value: null }
              : field,
          ),
          labels: [...item.labels, 'wontfix'],
          assignees: item.assignees.map((assignee) => assignee.login),
        },
      });
    });
    await app.evaluate(
      ({ BrowserWindow }, rendererUrl) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === rendererUrl)
          ?.reload(),
      page.url(),
    );
    await expect(page.getByTestId('board-view')).toBeVisible();

    // Moving an item straight into the implementation stage skips the analysis it is supposed
    // to arrive with. Nothing can run there afterwards, so the card has to say so instead of
    // looking like every other item waiting for a worker.
    const card = page.getByTestId('board-item-work-item-142');
    await card.click();
    await page.getByTestId('task-drawer-edit-content').click();
    await page.getByTestId('issue-project-field-field-status').locator('mosaik-select').click();
    await page.getByText('Ready', { exact: true }).last().click();
    await page.getByTestId('issue-save').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);

    await expect(indicator).toHaveAttribute('aria-label', /^Blocked/);
    await card.click({ button: 'right' });
    const solveAction = page.getByTestId('board-item-action-solve-work-item-142');
    await expect(solveAction).toContainText('Implement now');
    await expect(solveAction).toContainText('Qualified');
    await expect(solveAction).toHaveJSProperty('disabled', true);
    await page.keyboard.press('Escape');

    await card.click();
    health = page.getByTestId('task-health');
    const issueBanners = health.locator('mosaik-banner');
    await expect(issueBanners).toHaveCount(3);
    await expect(
      page.getByTestId('task-health-issue-analysis-missing-in-implementation-stage'),
    ).toContainText('without a completed analysis');
    await expect(page.getByTestId('task-health-issue-closing-label-in-active-stage')).toContainText(
      'Labelled "wontfix"',
    );
    await expect(
      page.getByTestId('task-health-issue-field-missing:field-assistant-phase'),
    ).toContainText('"Assistant phase" is not set');
    await expect(
      page.getByTestId('task-health-detail-analysis-missing-in-implementation-stage'),
    ).toContainText('every implementation starts from the stored analysis');
    await expect(
      page.getByTestId('task-health-remedy-analysis-missing-in-implementation-stage'),
    ).toContainText('Move the item back');
    await expect
      .poll(() =>
        health.evaluate((element) => {
          const style = window.getComputedStyle(element);
          const bottom = element.getBoundingClientRect().bottom;
          return {
            // Memphis elevation extends past the layout box; every banner's content must fit.
            fullyExpanded: [...element.children].every(
              (child) => child.getBoundingClientRect().bottom <= bottom + 0.5,
            ),
            overflowY: style.overflowY,
            position: style.position,
          };
        }),
      )
      .toEqual({ fullyExpanded: true, overflowY: 'visible', position: 'static' });
    await page.screenshot({
      path: resolve(outputDirectory, 'work-item-health-banners.png'),
      fullPage: true,
    });
    const drawer = page.getByTestId('task-drawer');
    await drawer.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await expect
      .poll(() =>
        health.evaluate((element) => {
          const drawerElement = element.closest('[test-id="task-drawer"]');
          return drawerElement
            ? element.getBoundingClientRect().bottom < drawerElement.getBoundingClientRect().top
            : false;
        }),
      )
      .toBe(true);
    await page.getByTestId('task-checks-section').click();
    // The step controls must not offer an analysis the stage would refuse to run.
    await expect(page.getByTestId('task-analysis-step')).toHaveCount(0);
    await expect(page.getByTestId('task-solution-step')).toHaveCount(0);
    await expect(page.getByTestId('task-no-step-available')).toContainText(
      'always starts from a completed analysis',
    );
  } finally {
    await app.close();
  }
});
