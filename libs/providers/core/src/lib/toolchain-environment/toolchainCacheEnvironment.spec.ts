// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { toolchainCacheEnvironment } from './toolchainCacheEnvironment';

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

describe('toolchainCacheEnvironment', () => {
  it('keeps every cache location inside the application-owned cache root', () => {
    // arrange
    const cacheRoot = temporaryDirectory();

    // act
    const values = Object.values(toolchainCacheEnvironment(cacheRoot)).filter(
      (value): value is string => typeof value === 'string',
    );

    // assert
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const path = value.startsWith('-') ? value.slice(value.indexOf('=') + 1) : value;
      if (isAbsolute(path)) expect(path.startsWith(cacheRoot)).toBe(true);
    }
  });
});
