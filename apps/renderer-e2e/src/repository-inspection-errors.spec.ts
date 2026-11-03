// #region Imports

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import type { BrowserWindow } from 'electron';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('isolates a broken Git worktree and groups its scoped errors while healthy repositories remain usable', async () => {
  // arrange
  const outputDirectory = resolve('output/playwright');
  mkdirSync(outputDirectory, { recursive: true });
  const configurationRoot = mkdtempSync(resolve(outputDirectory, 'repository-inspection-errors-'));
  const healthyPath = resolve(configurationRoot, 'healthy-checkout');
  const brokenPath = resolve(configurationRoot, 'broken-checkout');
  const missingGitDirectory = resolve(configurationRoot, 'missing-git-store/worktrees/broken');
  const emptyGitConfig = resolve(configurationRoot, 'empty-git-config');
  const brokenGitMarker = `gitdir: ${missingGitDirectory}\n`;
  const invalidRepositoryError =
    /fatal: (?:not a git repository|gitfile does not point to a valid repository)/u;
  const fixture = {
    healthyPath,
    brokenPath,
    healthyWorkspaceId: 'workspace:inspection-healthy',
    brokenWorkspaceId: 'workspace:inspection-broken',
    healthyRepositoryId: 'repository:inspection-healthy',
    brokenRepositoryId: 'repository:inspection-broken',
  };
  let app: ElectronApplication | undefined;

  try {
    mkdirSync(healthyPath);
    mkdirSync(brokenPath);
    writeFileSync(emptyGitConfig, '');
    writeFileSync(resolve(brokenPath, '.git'), brokenGitMarker);
    writeFileSync(resolve(brokenPath, 'README.md'), 'Preserve this checkout.\n');
    const gitEnvironment = {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: emptyGitConfig,
      GIT_TERMINAL_PROMPT: '0',
    };
    execFileSync('git', ['init', '--initial-branch=main', healthyPath], {
      env: gitEnvironment,
      stdio: 'pipe',
    });
    execFileSync(
      'git',
      [
        '-C',
        healthyPath,
        '-c',
        'user.name=Repository inspection fixture',
        '-c',
        'user.email=inspection@example.invalid',
        '-c',
        'commit.gpgsign=false',
        'commit',
        '--allow-empty',
        '-m',
        'Create isolated inspection fixture',
      ],
      { env: gitEnvironment, stdio: 'pipe' },
    );
    execFileSync(
      'git',
      ['-C', healthyPath, 'remote', 'add', 'origin', 'https://github.com/example/healthy.git'],
      { env: gitEnvironment, stdio: 'pipe' },
    );
    const healthyRevision = execFileSync('git', ['-C', healthyPath, 'rev-parse', 'HEAD'], {
      env: gitEnvironment,
      encoding: 'utf8',
    }).trim();

    app = await electron.launch({
      args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
      cwd: resolve('.'),
      env: {
        ...gitEnvironment,
        SYMPHONY_CONFIG_ROOT: configurationRoot,
        SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
        SYMPHONY_TRACKER_MODE: 'simulated',
        SYMPHONY_CONNECTION_MODE: 'simulated',
        SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
        // Exercise the real read-only Git acquisition adapter without executing target work.
        SYMPHONY_WORKSPACE_MODE: 'git',
        SYMPHONY_AGENT_MODE: 'simulated',
      },
    });
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await page.evaluate(async (data) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      const base = current.workspaces[0];
      if (!base) throw new Error('The isolated fixture needs its default workspace.');
      const workspaces = [
        {
          ...base,
          id: data.healthyWorkspaceId,
          displayName: 'Healthy workspace',
          shortCode: 'GOOD',
        },
        { ...base, id: data.brokenWorkspaceId, displayName: 'Broken workspace', shortCode: 'BAD' },
      ].map((workspace) => ({ ...workspace, localCiEnabled: false }));
      const connections = workspaces.map((workspace) => ({
        id: `github-${workspace.id}`,
        workspaceId: workspace.id,
        kind: 'github' as const,
        displayName: 'Inspection fixture GitHub',
        hostname: 'github.com',
        accountLogin: 'example',
        gitProtocol: 'https' as const,
      }));
      const repository = (healthy: boolean) => {
        const workspaceId = healthy ? data.healthyWorkspaceId : data.brokenWorkspaceId;
        return {
          id: healthy ? data.healthyRepositoryId : data.brokenRepositoryId,
          workspaceId,
          sourceControlConnectionId: `github-${workspaceId}`,
          displayName: healthy ? 'Healthy checkout' : 'Broken checkout',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'example',
          name: healthy ? 'healthy' : 'broken',
          defaultBranch: 'main',
          localPath: healthy ? data.healthyPath : data.brokenPath,
          enabled: true,
        };
      };
      await api.request('settings.save', {
        settings: {
          ...current,
          workspaces: [...current.workspaces, ...workspaces],
          connections: [...current.connections, ...connections],
          repositoryBindings: [...current.repositoryBindings, repository(true), repository(false)],
          activeViewScope: {
            ...current.activeViewScope,
            workspaceIds: [data.healthyWorkspaceId],
            workItemSourceId: undefined,
          },
          runtime: {
            ...current.runtime,
            automaticExecutionEnabled: false,
            autonomousExecutionEnabled: false,
          },
        },
      });
    }, fixture);

    // act
    // Reload normally so bootstrap hydrates the saved fixture through every desktop process.
    const mainWindow = await app.browserWindow(page);
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      mainWindow.evaluate((window: BrowserWindow) => window.webContents.reload()),
    ]);
    await prepareMainWindow(app);
    await expect(page.getByTestId('workspace-switcher-name')).toHaveJSProperty(
      'text',
      'Healthy workspace',
    );
    const statuses = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return api.request('repositories.runtime.list', {});
    });

    // assert
    expect(
      statuses.find((status) => status.repositoryBindingId === fixture.healthyRepositoryId),
    ).toMatchObject({
      preparation: { state: 'prepared', path: healthyPath, revision: healthyRevision },
    });
    expect(
      statuses.find((status) => status.repositoryBindingId === fixture.brokenRepositoryId),
    ).toMatchObject({
      workspaceId: fixture.brokenWorkspaceId,
      preparation: {
        state: 'unprepared',
        inspectionError: expect.stringMatching(invalidRepositoryError),
      },
    });

    const centre = page.getByTestId('notification-centre');
    const problem = page.getByTestId(
      `notification-item-repository-preparation:${fixture.brokenRepositoryId}`,
    );
    const notices = page.getByTestId(/^notification-notice-notice-\d+$/u);
    await page.getByTestId('notification-bell').click();
    await expect(problem).toBeVisible();
    await expect(problem).toContainText('Broken workspace');
    await expect(problem).toContainText('Broken checkout');
    await expect(problem).toContainText(invalidRepositoryError);
    await expect(notices).toHaveCount(1);
    await expect(notices).toContainText('Broken workspace › Broken checkout:');
    await page.keyboard.press('Escape');

    // Ordinary workspace changes re-check every repository but do not add duplicate history rows.
    for (const workspace of [
      { id: fixture.brokenWorkspaceId, name: 'Broken workspace' },
      { id: fixture.healthyWorkspaceId, name: 'Healthy workspace' },
    ]) {
      await page.getByTestId('global-workspace-filter').click();
      await page.getByTestId(`global-workspace-filter-${workspace.id}`).click();
      await expect(page.getByTestId('workspace-switcher-name')).toHaveJSProperty(
        'text',
        workspace.name,
      );
    }
    await page.getByTestId('notification-bell').click();
    await expect(notices).toHaveCount(1);
    await expect
      .poll(() =>
        notices
          .getByTestId(/^notification-notice-occurrences-/u)
          .evaluate((element) => Number.parseInt((element as { text?: string }).text ?? '0', 10)),
      )
      .toBeGreaterThanOrEqual(3);
    await expect(problem).toBeVisible();
    await page.screenshot({ path: resolve(outputDirectory, 'repository-inspection-errors.png') });

    // The failing repository opens in its own workspace, including identifiers with colons.
    await page
      .getByTestId(
        `notification-action-repository-preparation:${fixture.brokenRepositoryId}-open-repository`,
      )
      .click();
    await expect(centre).toHaveCount(0);
    await expect(page.getByTestId('settings-view')).toBeVisible();
    await expect(page.getByTestId('repository-editor')).toBeVisible();
    await expect(page.getByTestId('repository-display-name')).toHaveJSProperty(
      'value',
      'Broken checkout',
    );
    await expect(page.getByTestId('repository-local-path')).toHaveJSProperty('value', brokenPath);
    await expect
      .poll(() => new URLSearchParams(page.url().split('?')[1]).get('workspace'))
      .toBe(fixture.brokenWorkspaceId);
    expect(readFileSync(resolve(brokenPath, '.git'), 'utf8')).toBe(brokenGitMarker);
    expect(readFileSync(resolve(brokenPath, 'README.md'), 'utf8')).toBe(
      'Preserve this checkout.\n',
    );
    expect(existsSync(missingGitDirectory)).toBe(false);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app?.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
