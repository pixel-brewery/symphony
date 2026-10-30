// #region Imports

import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { releaseSandboxTemporaryDirectory } from './releaseSandboxTemporaryDirectory';
import { sandboxTemporaryDirectory } from './sandboxTemporaryDirectory';

// #endregion

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-toolchain-test-'));
  directories.push(directory);
  return directory;
}

describe('sandboxTemporaryDirectory', () => {
  it('reuses a run directory in the platform temporary root within the POSIX socket budget', () => {
    // arrange
    const runtimeRoot = join(
      temporaryDirectory(),
      'workspaces',
      `workspace-source-${'7'.repeat(40)}`,
    );

    // act
    const directory = sandboxTemporaryDirectory(runtimeRoot);

    // assert
    try {
      // Nx refuses socket paths over 95 characters, and the tools that open them spend roughly 45
      // on the socket name itself, so a directory below the managed runtime root cannot be used.
      expect(runtimeRoot.length).toBeGreaterThan(95);
      if (process.platform === 'win32') {
        expect(dirname(directory)).toBe(tmpdir());
      } else {
        expect(directory.length).toBeLessThan(48);
        expect(statSync(directory).mode & 0o777).toBe(0o700);
      }
      expect(sandboxTemporaryDirectory(runtimeRoot)).toBe(directory);
    } finally {
      releaseSandboxTemporaryDirectory(directory);
    }
    expect(existsSync(directory)).toBe(false);
  });

  it('does not adopt a temporary directory name held by something else', () => {
    // arrange
    const runtimeRoot = join(temporaryDirectory(), 'runtime');
    const expected = sandboxTemporaryDirectory(runtimeRoot);
    releaseSandboxTemporaryDirectory(expected);
    writeFileSync(expected, 'planted', { mode: 0o600 });

    // act
    const directory = sandboxTemporaryDirectory(runtimeRoot);

    // assert
    try {
      expect(directory).not.toBe(expected);
      expect(statSync(directory).isDirectory()).toBe(true);
      if (process.platform === 'win32') expect(dirname(directory)).toBe(tmpdir());
      else expect(directory.length).toBeLessThan(48);
    } finally {
      rmSync(expected, { force: true });
      releaseSandboxTemporaryDirectory(directory);
    }
  });
});
