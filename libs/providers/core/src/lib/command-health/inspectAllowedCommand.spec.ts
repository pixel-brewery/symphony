// #region Imports

import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetToolchainEnvironment } from '../toolchain-environment/resetToolchainEnvironment';
import { inspectAllowedCommand } from './inspectAllowedCommand';

// #endregion

const directories: string[] = [];

beforeEach(() => resetToolchainEnvironment());

afterEach(() => {
  resetToolchainEnvironment();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('inspectAllowedCommand', () => {
  it.skipIf(process.platform === 'win32')(
    'runs a Node-based CLI with recovered toolchain directories and its supplied environment',
    async () => {
      // arrange
      const root = mkdtempSync(join(tmpdir(), 'symphony-command-health-'));
      directories.push(root);
      const launcherDirectory = join(root, 'cli launchers');
      const nodeDirectory = join(root, '.volta', 'bin');
      mkdirSync(launcherDirectory, { recursive: true });
      mkdirSync(nodeDirectory, { recursive: true });
      symlinkSync(process.execPath, join(nodeDirectory, 'node'));
      const launcher = join(launcherDirectory, 'codex');
      writeFileSync(
        launcher,
        '#!/usr/bin/env node\nconsole.log(`codex-cli fixture ${process.env.SYMPHONY_DIAGNOSTIC_FIXTURE}`);\n',
      );
      chmodSync(launcher, 0o700);
      const environment = {
        HOME: root,
        PATH: launcherDirectory,
        SYMPHONY_DIAGNOSTIC_FIXTURE: 'preserved',
      };

      // act
      const health = await inspectAllowedCommand('codex', environment);

      // assert
      expect(health).toEqual({ available: true, version: 'codex-cli fixture preserved' });
      expect(environment.PATH).toBe(launcherDirectory);
    },
  );
});
