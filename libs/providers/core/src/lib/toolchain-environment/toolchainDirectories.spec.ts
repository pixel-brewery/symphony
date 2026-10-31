// #region Imports

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetToolchainEnvironment } from './resetToolchainEnvironment';
import { toolchainDirectories } from './toolchainDirectories';

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

describe('toolchainDirectories', () => {
  it.runIf(process.platform !== 'win32')(
    'imports the POSIX login shell PATH when the desktop started Symphony without a user environment',
    () => {
      // arrange
      const toolDirectory = temporaryDirectory();
      const environment = {
        PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
        SHELL: loginShell(toolDirectory),
      };

      // act
      const actual = toolchainDirectories(environment);

      // assert
      expect(actual).toContain(toolDirectory);
    },
  );

  it('keeps the inherited Windows PATH without importing a POSIX login shell', () => {
    // arrange
    const inheritedDirectory = temporaryDirectory();
    const shellDirectory = temporaryDirectory();
    vi.stubGlobal('process', Object.create(process, { platform: { value: 'win32' } }));

    // act
    const actual = toolchainDirectories({
      PATH: inheritedDirectory,
      SHELL: loginShell(shellDirectory),
    });

    // assert
    expect(actual).toContain(inheritedDirectory);
    expect(actual).not.toContain(shellDirectory);
  });

  it('keeps the inherited environment when Symphony was started from a shell', () => {
    // arrange
    const shellOnlyDirectory = temporaryDirectory();
    const inheritedDirectory = temporaryDirectory();
    const environment = {
      PATH: `${inheritedDirectory}${delimiter}/usr/bin`,
      SHELL: loginShell(shellOnlyDirectory),
    };

    // act
    const resolved = toolchainDirectories(environment);

    // assert
    expect(resolved).toContain(inheritedDirectory);
    expect(resolved).not.toContain(shellOnlyDirectory);
  });

  it('keeps existing PATH and home toolchains ahead of environment-derived package prefixes', () => {
    // arrange
    const inherited = temporaryDirectory();
    const home = temporaryDirectory();
    const npmPrefix = temporaryDirectory();
    const brewPrefix = temporaryDirectory();

    // act
    const actual = toolchainDirectories({
      PATH: inherited,
      HOME: home,
      NPM_CONFIG_PREFIX: npmPrefix,
      HOMEBREW_PREFIX: brewPrefix,
    });

    // assert
    const npmDirectory = process.platform === 'win32' ? npmPrefix : join(npmPrefix, 'bin');
    expect(actual[0]).toBe(inherited);
    expect(actual).toContain(npmDirectory);
    expect(actual).toContain(join(brewPrefix, 'bin'));
    expect(actual.indexOf(join(home, '.local/bin'))).toBeLessThan(actual.indexOf(npmDirectory));
  });

  it('uses the lowercase npm configuration prefix when both forms are provided', () => {
    // arrange
    const lowercase = temporaryDirectory();
    const uppercase = temporaryDirectory();

    // act
    const actual = toolchainDirectories({
      PATH: temporaryDirectory(),
      npm_config_prefix: lowercase,
      NPM_CONFIG_PREFIX: uppercase,
    });

    // assert
    expect(actual).toContain(process.platform === 'win32' ? lowercase : join(lowercase, 'bin'));
    expect(actual).not.toContain(process.platform === 'win32' ? uppercase : join(uppercase, 'bin'));
  });

  it('ignores relative package prefixes and keeps provider-specific directories out of shared PATH', () => {
    // arrange
    const codexInstaller = temporaryDirectory();
    const localAppData = temporaryDirectory();

    // act
    const actual = toolchainDirectories({
      PATH: temporaryDirectory(),
      NPM_CONFIG_PREFIX: 'relative/npm',
      HOMEBREW_PREFIX: 'relative/brew',
      CODEX_INSTALL_DIR: codexInstaller,
      LOCALAPPDATA: localAppData,
    });

    // assert
    expect(actual).not.toContain('relative/npm/bin');
    expect(actual).not.toContain('relative/brew/bin');
    expect(actual).not.toContain(codexInstaller);
    expect(actual).not.toContain(join(localAppData, 'Programs', 'OpenAI', 'Codex', 'bin'));
  });
});
