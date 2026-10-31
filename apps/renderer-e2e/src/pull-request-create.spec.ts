// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

test('opens a pull request from the Pull Requests view', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(
    outputDirectory,
    `pull-request-create-configuration-${process.pid}`,
  );
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
        id: 'pull-request-account',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Example GitHub',
        hostname: 'github.com',
        accountLogin: 'example-admin',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'pull-request-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'symphony-e2e/pull-request-drawer',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'symphony-e2e',
        name: 'pull-request-drawer',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      await api.request('settings.save', {
        settings: {
          ...current,
          connections: [...current.connections, connection],
          repositoryBindings: [...current.repositoryBindings, repository],
        },
      });
    }, workspace);
    await app.close();

    app = await electron.launch(launchOptions);
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-pull-requests').click();
    await expect(page.getByTestId('pull-requests-view')).toBeVisible();

    const createPullRequest = page.getByTestId('create-pull-request');
    await expect(createPullRequest).toHaveAttribute('aria-label', 'New pull request');
    await expect(createPullRequest).toHaveJSProperty('disabled', false);
    await createPullRequest.click();

    const drawer = page.getByTestId('pull-request-create-drawer');
    await expect(drawer).toBeVisible();
    // The drawer starts on the default branch and the first branch that can be compared with it.
    await expect(page.getByTestId('pull-request-base-branch')).toContainText('main');
    await expect(page.getByTestId('pull-request-compare-branch')).toContainText('develop');
    await expect(page.getByTestId('pull-request-comparison')).toContainText('Able to merge');
    await expect(page.getByTestId('pull-request-comparison')).toContainText(
      '2 commits and 3 changed files would enter main',
    );
    await expect(page.getByTestId('pull-request-title').locator('input')).toHaveValue('Develop');
    // The drawer slides in; the screenshot is only useful once it rests.
    await page.waitForTimeout(400);
    await page.screenshot({
      path: resolve(outputDirectory, 'pull-request-create-drawer.png'),
      fullPage: true,
    });

    await page.getByTestId('pull-request-compare-branch').click();
    await page.getByTestId('pull-request-compare-branch-feature/mobile-companion').click();
    await expect(page.getByTestId('pull-request-compare-branch')).toContainText(
      'feature/mobile-companion',
    );
    // GitHub keeps prefilling the title until the operator writes one.
    await expect(page.getByTestId('pull-request-title').locator('input')).toHaveValue(
      'Feature/mobile companion',
    );

    await expect(page.getByTestId('pull-request-commit-simulated-commit-2')).toContainText(
      'Prepare feature/mobile-companion',
    );

    await page
      .getByTestId('pull-request-title')
      .locator('input')
      .fill('Open pull requests from the delivery view');
    await page
      .getByTestId('pull-request-body')
      .locator('textarea')
      .fill('## Summary\n\nAdds the compare drawer.');
    await expect(page.getByTestId('pull-request-body-preview')).toContainText('Summary');

    await page.getByTestId('pull-request-draft').click();
    const submit = page.getByTestId('pull-request-create-submit');
    await expect(submit).toContainText('Create draft pull request');
    await page.screenshot({
      path: resolve(outputDirectory, 'pull-request-create-drawer-filled.png'),
      fullPage: true,
    });
    await submit.click();

    await expect(drawer).toHaveCount(0);
    const created = page
      .getByTestId('pull-requests-list')
      .filter({ hasText: 'Open pull requests from the delivery view' });
    await expect(created).toBeVisible();
    await expect(created).toContainText('Draft');

    // The new draft is listed under Drafts, and the inspector shows the selected pull request.
    await page.getByTestId('pull-requests-segment-drafts').click();
    await expect(page).toHaveURL(/view=drafts/u);
    await expect(created).toBeVisible();
    await expect(page.getByTestId('pull-request-inspector-title')).toContainText(
      'Open pull requests from the delivery view',
    );
    await expect(page.getByTestId('pull-request-open-in-github')).toBeVisible();

    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
