// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { _electron as electron } from '@playwright/test';
import type { IArcadeAppSession } from './IArcadeAppSession';

// #endregion

/** Starts a real desktop process with disposable scenario-owned storage. @public */
export async function launchArcadeApp(
  scenario: string,
  resetConfiguration = true,
): Promise<IArcadeAppSession> {
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `arcade-${scenario}-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  if (resetConfiguration) rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
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
  return { app, configurationRoot, outputDirectory };
}
