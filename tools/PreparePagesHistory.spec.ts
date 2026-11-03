// #region Imports

import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PreparePagesHistory } from './PreparePagesHistory.mjs';

// #endregion

let workspace: string;
let sourceDirectory: string;
let outputFile: string;
const version = '0.1.27';
const manifestBytes = Buffer.from(
  '{\n "schemaVersion": 1, "version": "0.1.27",\n "sourceCommit": "original-commit", "createdAt": "2026-11-03T04:53:29.240Z", "files": [{"name":"installer"}]\n}\n',
);
const iconBytes = Buffer.from([0, 0, 1, 0, 255, 42]);

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'symphony-pages-history-'));
  sourceDirectory = join(workspace, 'source');
  outputFile = join(workspace, 'archive.json');
  await mkdir(join(sourceDirectory, 'releases', version, 'shared'), { recursive: true });
  await writeFile(join(sourceDirectory, 'releases', version, 'manifest.json'), manifestBytes);
  await writeFile(join(sourceDirectory, 'releases', version, 'shared', 'symphony.ico'), iconBytes);
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('historical Pages metadata archive', () => {
  it('preserves the exact original manifest and icon bytes in a deterministic archive', async () => {
    // arrange
    const secondOutput = join(workspace, 'second.json');

    // act
    const result = await PreparePagesHistory({ sourceDirectory, outputFile });
    await PreparePagesHistory({ sourceDirectory, outputFile: secondOutput });
    const bytes = await readFile(outputFile);
    const archive = JSON.parse(bytes.toString('utf8'));

    // assert
    expect(result).toEqual({ outputFile, fileCount: 2, versionCount: 1 });
    expect(bytes.equals(await readFile(secondOutput))).toBe(true);
    expect(archive.schemaVersion).toBe(1);
    expect(archive.files).toEqual([
      { path: `releases/${version}/manifest.json`, data: manifestBytes.toString('base64') },
      { path: `releases/${version}/shared/symphony.ico`, data: iconBytes.toString('base64') },
    ]);
  });

  it('refuses to archive an incomplete historical release', async () => {
    // arrange
    await rm(join(sourceDirectory, 'releases', version, 'shared', 'symphony.ico'));

    // act
    const operation = PreparePagesHistory({ sourceDirectory, outputFile });

    // assert
    await expect(operation).rejects.toThrow(/must include its manifest and icon/u);
    await expect(readFile(outputFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects an empty historical version directory', async () => {
    // arrange
    await mkdir(join(sourceDirectory, 'releases', '0.1.26'));

    // act
    const operation = PreparePagesHistory({ sourceDirectory, outputFile });

    // assert
    await expect(operation).rejects.toThrow(/Historical release 0.1.26 must include/u);
  });

  it('rejects unrelated files instead of publishing them as historical metadata', async () => {
    // arrange
    await writeFile(join(sourceDirectory, 'releases', version, 'private.txt'), 'not metadata');

    // act
    const operation = PreparePagesHistory({ sourceDirectory, outputFile });

    // assert
    await expect(operation).rejects.toThrow(/Unsupported historical Pages file/u);
  });

  it('rejects a manifest whose version does not match its historical URL', async () => {
    // arrange
    await writeFile(
      join(sourceDirectory, 'releases', version, 'manifest.json'),
      JSON.stringify({ schemaVersion: 1, version: '9.9.9', files: [{}] }),
    );

    // act
    const operation = PreparePagesHistory({ sourceDirectory, outputFile });

    // assert
    await expect(operation).rejects.toThrow(/incompatible manifest/u);
  });

  it('rejects an archive destination inside the source tree', async () => {
    // arrange
    const destination = join(sourceDirectory, 'archive.json');

    // act
    const operation = PreparePagesHistory({ sourceDirectory, outputFile: destination });

    // assert
    await expect(operation).rejects.toThrow(/outside the source directory/u);
  });

  it.skipIf(process.platform === 'win32')(
    'rejects symbolic links in the historical tree',
    async () => {
      // arrange
      const iconPath = join(sourceDirectory, 'releases', version, 'shared', 'symphony.ico');
      const outsideFile = join(workspace, 'external.ico');
      await writeFile(outsideFile, iconBytes);
      await rm(iconPath);
      await symlink(outsideFile, iconPath);

      // act
      const operation = PreparePagesHistory({ sourceDirectory, outputFile });

      // assert
      await expect(operation).rejects.toThrow(/must not contain symbolic links/u);
    },
  );

  it('rejects oversized files before writing the archive', async () => {
    // arrange
    await writeFile(
      join(sourceDirectory, 'releases', version, 'shared', 'symphony.ico'),
      Buffer.alloc(1024 * 1024 + 1),
    );

    // act
    const operation = PreparePagesHistory({ sourceDirectory, outputFile });

    // assert
    await expect(operation).rejects.toThrow(/size limit/u);
  });
});
