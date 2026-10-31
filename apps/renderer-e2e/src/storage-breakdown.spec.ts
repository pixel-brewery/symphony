// #region Imports

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettings } from './openSettings';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

/**
 * A managed tree past the governor's inline entry budget, which is the case a small fixture
 * never reaches: measurement moves to a background pass, and until it completes there is no
 * allocation to report. The settings page has to survive that window without inventing one.
 */
const INLINE_BUDGET_ENTRIES = 10_000;

function fill(path: string, bytes: number): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.alloc(bytes));
}

test('breaks measured storage into named shares and never reports an unmeasured total', async () => {
  // arrange
  test.setTimeout(180_000);
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `storage-breakdown-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });

  const digest = createHash('sha256').update('personal').digest('hex').slice(0, 12);
  const workspaceRoot = resolve(configurationRoot, 'workspaces', `personal-${digest}`);
  const localCiRoot = resolve(configurationRoot, 'workspaces', 'local-ci');
  fill(resolve(configurationRoot, 'app-data', 'state.bin'), 40 * 1024 * 1024);
  fill(resolve(workspaceRoot, 'repositories', 'clone.bin'), 24 * 1024 * 1024);
  fill(resolve(workspaceRoot, 'executions', 'worktree.bin'), 16 * 1024 * 1024);
  fill(resolve(localCiRoot, 'tools', 'runner.bin'), 32 * 1024 * 1024);
  fill(resolve(localCiRoot, 'cache', 'lima-downloads', 'base.img'), 20 * 1024 * 1024);
  // Push the tree past the inline budget so the orchestrator has to measure in the background.
  for (let batch = 0; batch < 12; batch += 1) {
    const parent = resolve(workspaceRoot, 'executions', `bulk-${batch}`);
    mkdirSync(parent, { recursive: true });
    for (let file = 0; file < INLINE_BUDGET_ENTRIES / 10; file += 1) {
      writeFileSync(resolve(parent, `file-${file}`), 'x');
    }
  }

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
    const main = await prepareMainWindow(app);
    const page = await openSettings(main);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await page.getByTestId('global-settings-section-system').click();
    await expect(page.getByTestId('storage-safety-card')).toBeVisible();

    // While the background pass runs the card says so; it never shows the placeholder as a
    // measurement, and it never offers a legend describing space it has not counted.
    const size = page.getByTestId('global-storage-size');
    if ((await size.textContent())?.includes('Measuring')) {
      await expect(page.getByTestId('global-storage-progress-legend-available')).toHaveCount(0);
    }

    await expect(size).toContainText('MB', { timeout: 120_000 });
    await expect(size).not.toContainText('Measuring');

    // Every category the walk attributed names itself, and the shares of the managed total
    // repeat the numbers the dedicated bars show.
    const legend = page.getByTestId('global-storage-progress-legend');
    await expect(legend).toContainText('Application state');
    await expect(legend).toContainText('Managed workspaces');
    await expect(legend).toContainText('Local GitHub Actions');
    await expect(legend).toContainText('Available');

    const shares = await page.evaluate(async () => {
      const api = (
        window as unknown as {
          orchestration: {
            request(
              method: 'storage.status.get',
              payload: Record<string, never>,
            ): Promise<{
              measured: boolean;
              global: {
                allocatedBytes: number;
                segments: readonly { id: string; allocatedBytes: number }[];
              };
              localCi: { allocatedBytes: number };
              workspaces: readonly { allocatedBytes: number }[];
            }>;
          };
        }
      ).orchestration;
      const status = await api.request('storage.status.get', {});
      const share = (id: string) =>
        status.global.segments.find((segment) => segment.id === id)?.allocatedBytes ?? 0;
      return {
        measured: status.measured,
        total: status.global.allocatedBytes,
        segmentSum: status.global.segments.reduce(
          (sum, segment) => sum + segment.allocatedBytes,
          0,
        ),
        localCiShare: share('local-ci'),
        localCiTotal: status.localCi.allocatedBytes,
        workspacesShare: share('workspaces'),
        workspacesTotal: status.workspaces.reduce((sum, entry) => sum + entry.allocatedBytes, 0),
      };
    });

    expect(shares.measured).toBe(true);
    expect(shares.total).toBeGreaterThan(100 * 1024 * 1024);
    expect(shares.segmentSum).toBe(shares.total);
    expect(shares.localCiShare).toBe(shares.localCiTotal);
    expect(shares.workspacesShare).toBe(shares.workspacesTotal);

    // System is the single storage picture: each workspace's share and Local GitHub Actions
    // with its breakdown and own limit sit beside the managed limit and the free-space reserve.
    await expect(page.getByTestId('workspace-storage-shares')).toContainText(
      'each limit is set in the workspace’s Administration',
    );
    await expect(page.getByTestId('local-ci-storage-share')).toContainText('Local GitHub Actions');
    await expect(page.getByTestId('local-ci-storage-limit')).toBeVisible();
    await expect(page.getByTestId('managed-storage-limit')).toBeVisible();
    await expect(page.getByTestId('minimum-free-disk')).toBeVisible();
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
