// #region Imports

import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { openSettingsWindow } from './openSettingsWindow';

// #endregion

test('recovers a Lima runtime alias before clearing local runner data', async () => {
  test.skip(
    process.platform !== 'darwin' || (process.arch !== 'arm64' && process.arch !== 'x64'),
    'Managed Lima runners are available only on supported Macs.',
  );

  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `local-ci-recovery-${process.pid}`);
  const runtimeRoot = resolve(configurationRoot, 'workspaces', 'local-ci');
  const lima = resolve(runtimeRoot, 'tools', `lima-2.2.0-${process.arch}`, 'bin', 'limactl');
  const aliasDigest = createHash('sha256').update(runtimeRoot).digest('hex').slice(0, 16);
  const alias = `/tmp/symphony-lima-${aliasDigest}`;
  const orchestratorLog = resolve(configurationRoot, 'logs', 'orchestrator.jsonl');
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  rmSync(alias, { force: true, recursive: true });
  mkdirSync(dirname(lima), { recursive: true });
  writeFileSync(lima, '#!/bin/sh\nexit 0\n');
  chmodSync(lima, 0o700);
  mkdirSync(resolve(alias, '_config'), { recursive: true });
  writeFileSync(resolve(alias, '_config', 'networks.yaml'), 'paths: {}\n');

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
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect.poll(() => existsSync(alias)).toBe(false);

    // Virtual machines describe this Mac, so they live under Settings › System.
    const settings = await openSettingsWindow(app, page);
    await settings.getByTestId('global-settings-section-system').click();
    await expect(settings.getByTestId('virtual-machines-card')).toBeVisible();
    await expect(settings.getByTestId('local-ci-machines-empty')).toBeVisible();
    await settings.getByTestId('clear-local-ci-data').click();
    await expect(settings.getByText('Clear local runner data?')).toBeVisible();
    await settings.getByText('Clear runner data', { exact: true }).last().click();
    await expect.poll(() => existsSync(runtimeRoot)).toBe(false);
    await expect(page.getByTestId('notification-error')).toHaveCount(0);
    await expect(settings.getByTestId('notification-error')).toHaveCount(0);
    expect(rendererErrors).toEqual([]);
    expect(readFileSync(orchestratorLog, 'utf8')).not.toContain('EISDIR');
  } finally {
    await app.close();
    rmSync(alias, { force: true, recursive: true });
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
