// #region Imports

import { mkdtempSync, rmSync, statSync, writeFileSync, type Stats } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { allocatedBytes } from './allocatedBytes';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('allocatedBytes', () => {
  it('counts reported allocation without charging a sparse file logical size', () => {
    // arrange
    const file = fileStats(8 * 1024 ** 3, 8);

    // act
    const allocated = allocatedBytes(file);

    // assert
    expect(allocated).toBe(4_096);
  });

  it('keeps an explicitly reported zero allocation instead of falling back to logical size', () => {
    // arrange
    const file = fileStats(8 * 1024 ** 3, 0);

    // act
    const allocated = allocatedBytes(file);

    // assert
    expect(allocated).toBe(0);
  });

  it.each([undefined, -1])(
    'counts the full logical size when allocation metadata is %s',
    (blocks) => {
      // arrange
      const file = fileStats(8 * 1024 ** 3, blocks);

      // act
      const allocated = allocatedBytes(file);

      // assert
      expect(allocated).toBe(8 * 1024 ** 3);
    },
  );
});

function fileStats(size: number, blocks: number | undefined): Stats {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-allocation-stat-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'fixture.bin');
  writeFileSync(path, 'x');
  const file = statSync(path);
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'blocks', { value: blocks });
  return file;
}
