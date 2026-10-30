// #region Imports

import { linkSync, mkdtempSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { allocatedDirectoryBytes } from './allocatedDirectoryBytes';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('allocatedDirectoryBytes', () => {
  it('uses reported sparse storage and conservatively counts logical size without block metadata', () => {
    // arrange
    const root = temporaryDirectory();
    const sparse = join(root, 'disk.img');
    const logicalBytes = 128 * 1024 ** 2;
    writeFileSync(sparse, Buffer.alloc(4_096));
    truncateSync(sparse, logicalBytes);
    const file = statSync(sparse);

    // act
    const allocated = allocatedDirectoryBytes([root]);

    // assert
    expect(file.size).toBe(logicalBytes);
    if (typeof file.blocks !== 'number' || file.blocks < 0) {
      // Without block metadata, the existing safe fallback is the full logical size.
      expect(allocated).toBeGreaterThanOrEqual(logicalBytes);
    } else if (file.blocks * 512 < logicalBytes / 2) {
      // Only claim sparse allocation when this filesystem actually reports sparse storage.
      expect(allocated).toBeGreaterThanOrEqual(file.blocks * 512);
      expect(allocated).toBeLessThan(logicalBytes / 2);
    } else {
      expect(allocated).toBeGreaterThanOrEqual(file.blocks * 512);
    }
  });

  it('counts multiply-linked file blocks only once without retaining every ordinary inode', () => {
    // arrange
    const root = temporaryDirectory();
    const original = join(root, 'original.bin');
    writeFileSync(original, Buffer.alloc(1024 * 1024));
    linkSync(original, join(root, 'linked.bin'));

    // act
    const allocated = allocatedDirectoryBytes([root]);

    // assert
    expect(allocated).toBeLessThan(1.5 * 1024 * 1024);
  });
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-allocation-'));
  temporaryDirectories.push(directory);
  return directory;
}
