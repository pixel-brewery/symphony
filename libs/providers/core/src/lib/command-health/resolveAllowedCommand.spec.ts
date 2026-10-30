// #region Imports

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, normalize, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registeredCodexApplications } from './registeredCodexApplications';
import { resolveAllowedCommand } from './resolveAllowedCommand';

// #endregion

const fixture = vi.hoisted(() => ({
  root: '',
  platform: 'darwin' as NodeJS.Platform,
  inaccessible: new Set<string>(),
}));

vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  platform: () => fixture.platform,
}));

vi.mock('../toolchain-environment/LoginShellDirectories', () => ({
  loginShellDirectories: { resolve: () => [] },
}));

vi.mock('./registeredCodexApplications', () => ({
  registeredCodexApplications: vi.fn(() => []),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const path = await import('node:path');
  const resolveFixture = (candidate: import('node:fs').PathLike): string => {
    const value = String(candidate);
    const applicationRoot = path.normalize('/Applications');
    if (value.startsWith(applicationRoot + path.sep)) {
      return path.join(fixture.root, 'system-apps', value.slice(applicationRoot.length + 1));
    }
    if (value.startsWith(fixture.root + path.sep)) return value;
    throw new Error('Candidate is outside the isolated test filesystem.');
  };
  return {
    ...actual,
    statSync: (candidate: import('node:fs').PathLike) => actual.statSync(resolveFixture(candidate)),
    accessSync: (candidate: import('node:fs').PathLike, mode?: number) => {
      if (fixture.inaccessible.has(String(candidate))) throw new Error('Permission denied.');
      return actual.accessSync(resolveFixture(candidate), mode);
    },
    openSync: (
      candidate: import('node:fs').PathLike,
      flags: import('node:fs').OpenMode,
      mode?: import('node:fs').Mode,
    ) => actual.openSync(resolveFixture(candidate), flags, mode),
  };
});

beforeEach(() => {
  fixture.root = mkdtempSync(join(tmpdir(), 'symphony-command-'));
  fixture.platform = 'darwin';
  fixture.inaccessible.clear();
  vi.mocked(registeredCodexApplications).mockReset().mockReturnValue([]);
});

afterEach(() => {
  rmSync(fixture.root, { recursive: true, force: true });
});

function fixturePath(candidate: string): string {
  const applicationRoot = normalize('/Applications');
  return candidate.startsWith(applicationRoot + sep)
    ? join(fixture.root, 'system-apps', candidate.slice(applicationRoot.length + 1))
    : candidate;
}

function executable(candidate: string): string {
  const destination = fixturePath(candidate);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  chmodSync(destination, 0o700);
  return candidate;
}

describe('resolveAllowedCommand', () => {
  it('prefers the supplied PATH over an installed application and installer override', () => {
    // arrange
    const directory = join(fixture.root, 'path');
    const selected = executable(join(directory, 'codex'));
    const installer = join(fixture.root, 'installer');
    executable(join(installer, 'codex'));
    executable(
      join('/Applications', 'ChatGPT.app', 'Contents', 'Resources', 'codex-cli', 'bin', 'codex'),
    );

    // act
    const actual = resolveAllowedCommand('codex', {
      PATH: directory,
      CODEX_INSTALL_DIR: installer,
    });

    // assert
    expect(actual).toBe(selected);
    expect(registeredCodexApplications).not.toHaveBeenCalled();
  });

  it('finds the current ChatGPT application launcher with a stripped GUI PATH', () => {
    // arrange
    const selected = executable(
      join('/Applications', 'ChatGPT.app', 'Contents', 'Resources', 'codex-cli', 'bin', 'codex'),
    );

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '/usr/bin:/bin:/usr/sbin:/sbin' });

    // assert
    expect(actual).toBe(selected);
    expect(registeredCodexApplications).not.toHaveBeenCalled();
  });

  it('finds a Codex application in the user Applications directory', () => {
    // arrange
    const home = join(fixture.root, 'home');
    const selected = executable(
      join(home, 'Applications', 'Codex.app', 'Contents', 'Resources', 'codex-cli', 'bin', 'codex'),
    );

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '', HOME: home });

    // assert
    expect(actual).toBe(selected);
  });

  it('uses a bounded manifest entrypoint before the application known layouts', () => {
    // arrange
    const cliRoot = join('/Applications', 'Codex.app', 'Contents', 'Resources', 'codex-cli');
    const selected = executable(join(cliRoot, 'custom', 'codex'));
    executable(join(cliRoot, 'bin', 'codex'));
    writeFileSync(
      fixturePath(join(cliRoot, 'codex-package.json')),
      JSON.stringify({ layoutVersion: 1, entrypoint: 'custom/codex' }),
    );

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '' });

    // assert
    expect(actual).toBe(selected);
  });

  it.each([
    ['the embedded native executable', ['codex-cli', 'CodexCLI.app', 'Contents', 'MacOS', 'codex']],
    ['the legacy application layout', ['codex']],
  ])('falls back to %s when the current launcher is missing', (_description, relativePath) => {
    // arrange
    const selected = executable(
      join('/Applications', 'ChatGPT.app', 'Contents', 'Resources', ...relativePath),
    );

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '' });

    // assert
    expect(actual).toBe(selected);
  });

  it('resolves a relocated registered application after the default roots are exhausted', () => {
    // arrange
    const application = join(fixture.root, 'Moved Applications', 'Renamed.app');
    const selected = executable(
      join(application, 'Contents', 'Resources', 'codex-cli', 'bin', 'codex'),
    );
    vi.mocked(registeredCodexApplications).mockReturnValue([application]);

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '' });

    // assert
    expect(actual).toBe(selected);
    expect(registeredCodexApplications).toHaveBeenCalledOnce();
  });

  it('skips directories and inaccessible files before using the Codex installer override', () => {
    // arrange
    const directoryCandidate = join(fixture.root, 'directory');
    mkdirSync(join(directoryCandidate, 'codex'), { recursive: true });
    const deniedDirectory = join(fixture.root, 'denied');
    fixture.inaccessible.add(executable(join(deniedDirectory, 'codex')));
    const installer = join(fixture.root, 'standalone');
    const selected = executable(join(installer, 'codex'));

    // act
    const actual = resolveAllowedCommand('codex', {
      PATH: [directoryCandidate, deniedDirectory].join(delimiter),
      CODEX_INSTALL_DIR: installer,
    });

    // assert
    expect(actual).toBe(selected);
    expect(registeredCodexApplications).not.toHaveBeenCalled();
  });

  it('does not search the Codex installer directory for another provider command', () => {
    // arrange
    const installer = join(fixture.root, 'standalone');
    executable(join(installer, 'claude'));

    // act
    const actual = resolveAllowedCommand('claude', { PATH: '', CODEX_INSTALL_DIR: installer });

    // assert
    expect(actual).toBe('claude');
    expect(registeredCodexApplications).not.toHaveBeenCalled();
  });

  it('finds the Windows standalone executable in its per-user default directory', () => {
    // arrange
    fixture.platform = 'win32';
    const localAppData = join(fixture.root, 'AppData', 'Local');
    const selected = executable(
      join(localAppData, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
    );

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '', LOCALAPPDATA: localAppData });

    // assert
    expect(actual).toBe(selected);
    expect(registeredCodexApplications).not.toHaveBeenCalled();
  });

  it('does not cache a missing registered application across later refreshes', () => {
    // arrange
    expect(resolveAllowedCommand('codex', { PATH: '' })).toBe('codex');
    const application = join(fixture.root, 'New Applications', 'Codex.app');
    const selected = executable(
      join(application, 'Contents', 'Resources', 'codex-cli', 'bin', 'codex'),
    );
    vi.mocked(registeredCodexApplications).mockReturnValue([application]);

    // act
    const actual = resolveAllowedCommand('codex', { PATH: '' });

    // assert
    expect(actual).toBe(selected);
    expect(registeredCodexApplications).toHaveBeenCalledTimes(2);
  });

  it('never treats the executable of the OpenCode desktop app as the CLI', () => {
    // arrange
    const directory = join(fixture.root, 'OpenCode.app', 'Contents', 'MacOS');
    executable(join(directory, 'opencode'));

    // act / assert
    expect(() => resolveAllowedCommand('opencode', { PATH: directory })).toThrow(
      'OpenCode CLI is not installed.',
    );
  });
});
