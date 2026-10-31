// #region Imports

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetToolchainEnvironment } from './resetToolchainEnvironment';
import { resolveToolchainExecutable } from './resolveToolchainExecutable';

// #endregion

const directories: string[] = [];

beforeEach(() => resetToolchainEnvironment());

afterEach(() => {
  vi.unstubAllGlobals();
  resetToolchainEnvironment();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function loginShell(contributedDirectory: string): string {
  const shell = join(temporaryDirectory(), 'login-shell');
  writeFileSync(
    shell,
    `#!/bin/sh\nshift\nPATH="${contributedDirectory}:$PATH"\nexport PATH\nexec /bin/sh -c "$1"\n`,
  );
  chmodSync(shell, 0o700);
  return shell;
}

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-toolchain-'));
  mkdirSync(directory, { recursive: true });
  directories.push(directory);
  return directory;
}

describe('resolveToolchainExecutable', () => {
  it.runIf(process.platform !== 'win32')(
    'resolves an executable that only the POSIX login shell knows about',
    () => {
      // arrange
      const toolDirectory = temporaryDirectory();
      const executable = join(toolDirectory, 'yarn');
      writeFileSync(executable, '#!/bin/sh\nexit 0\n');
      chmodSync(executable, 0o700);
      const environment = { PATH: '/usr/bin:/bin', SHELL: loginShell(toolDirectory) };

      // act
      const actual = resolveToolchainExecutable('yarn', environment);

      // assert
      expect(actual).toBe(executable);
    },
  );

  it('leaves Windows executable resolution to the native command adapter', () => {
    // arrange
    const directory = temporaryDirectory();
    writeFileSync(join(directory, 'yarn.exe'), 'fixture executable');
    vi.stubGlobal('process', Object.create(process, { platform: { value: 'win32' } }));

    // act
    const actual = resolveToolchainExecutable('yarn', { PATH: directory });

    // assert
    expect(actual).toBeUndefined();
  });
});
