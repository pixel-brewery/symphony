// #region Imports

import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BuildDownloadSite } from './BuildDownloadSite.mjs';

// #endregion

function release(version: string) {
  return {
    version,
    htmlUrl: `https://github.com/pixel-brewery/symphony/releases/tag/v${version}`,
    publishedAt: '2026-11-03T04:53:44Z',
    manifest: {
      schemaVersion: 1,
      version,
      sourceCommit: 'a'.repeat(40),
      createdAt: '2026-11-03T04:53:29.240Z',
      files: [
        { platform: 'darwin', name: `Symphony-darwin-arm64-${version}.dmg` },
        { platform: 'win32', name: 'SymphonySetup.exe' },
        { platform: 'linux', name: `symphony_${version}_arm64.deb` },
      ].map((file) => ({
        ...file,
        architecture: 'arm64',
        bytes: 42,
        sha256: 'b'.repeat(64),
        url: `https://github.com/pixel-brewery/symphony/releases/download/v${version}/${file.name}`,
      })),
    },
  };
}

const releases = [release('0.1.26'), release('0.1.27')];
const catalog = { schemaVersion: 1, stable: '0.1.26', canary: '0.1.27', releases };
let temporaryDirectory: string;
let sourceDirectory: string;
let outputDirectory: string;

async function writeMetadata(directory = sourceDirectory) {
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'catalog.json'), JSON.stringify(catalog));
  for (const entry of [...releases, release('0.1.17')]) {
    const versionDirectory = resolve(directory, 'releases', entry.version);
    await mkdir(resolve(versionDirectory, 'shared'), { recursive: true });
    await writeFile(
      resolve(versionDirectory, 'manifest.json'),
      `${JSON.stringify(entry.manifest, undefined, 4)}\n`,
    );
    await writeFile(
      resolve(versionDirectory, 'shared', 'symphony.ico'),
      Buffer.from([0, 0, 1, 0, 42]),
    );
  }
}

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'symphony-download-site-'));
  sourceDirectory = resolve(temporaryDirectory, 'source');
  outputDirectory = resolve('out', `download-site-spec-${randomUUID()}`);
  await writeMetadata();
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
  await rm(outputDirectory, { recursive: true, force: true });
});

describe('complete download site publication', () => {
  it('preserves all historical manifest and icon bytes while building independent channel feeds', async () => {
    // arrange
    const originalManifest = await readFile(
      resolve(sourceDirectory, 'releases/0.1.17/manifest.json'),
    );
    const originalIcon = await readFile(
      resolve(sourceDirectory, 'releases/0.1.17/shared/symphony.ico'),
    );

    // act
    const result = await BuildDownloadSite({ sourceDirectory, outputDirectory });

    // assert
    expect(result).toMatchObject({ stable: '0.1.26', canary: '0.1.27', releaseCount: 2 });
    expect(await readFile(resolve(outputDirectory, 'releases/0.1.17/manifest.json'))).toEqual(
      originalManifest,
    );
    expect(await readFile(resolve(outputDirectory, 'releases/0.1.17/shared/symphony.ico'))).toEqual(
      originalIcon,
    );
    for (const [channel, release] of [
      ['stable', releases[0]],
      ['canary', releases[1]],
    ] as const) {
      for (const file of release.manifest.files) {
        const feed = await readFile(
          resolve(outputDirectory, 'channels', channel, file.platform, 'arm64', 'installer.json'),
          'utf8',
        );
        expect(feed).toBe(
          `${JSON.stringify(
            {
              schemaVersion: 1,
              version: release.version,
              platform: file.platform,
              architecture: 'arm64',
              artifact: { name: file.name, bytes: file.bytes, sha256: file.sha256, url: file.url },
            },
            undefined,
            2,
          )}\n`,
        );
      }
    }
    expect(await readFile(resolve(outputDirectory, 'index.html'), 'utf8')).toContain(
      'Download Symphony',
    );
    expect(
      (await readFile(resolve(outputDirectory, 'assets/symphony.png'))).length,
    ).toBeGreaterThan(0);
    expect(
      (await readFile(resolve(outputDirectory, 'assets/downloads.css'))).length,
    ).toBeGreaterThan(0);
  });

  it('keeps an earlier publication intact when a platform is missing', async () => {
    // arrange
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, 'index.html'), 'existing publication');
    const invalidCatalog = structuredClone(catalog);
    invalidCatalog.releases[0].manifest.files.pop();
    await writeFile(resolve(sourceDirectory, 'catalog.json'), JSON.stringify(invalidCatalog));

    // act
    const build = BuildDownloadSite({ sourceDirectory, outputDirectory });

    // assert
    await expect(build).rejects.toThrow(/invalid or duplicate release metadata/u);
    expect(await readFile(resolve(outputDirectory, 'index.html'), 'utf8')).toBe(
      'existing publication',
    );
  });

  it('rejects unexpected binaries in the historical metadata tree', async () => {
    // arrange
    await writeFile(resolve(sourceDirectory, 'releases/0.1.17/unexpected.exe'), 'installer');

    // act
    const build = BuildDownloadSite({ sourceDirectory, outputDirectory });

    // assert
    await expect(build).rejects.toThrow(/Unexpected historical metadata file/u);
  });

  it('rejects a catalog that disagrees with the preserved version manifest', async () => {
    // arrange
    const changedManifest = structuredClone(releases[0].manifest);
    changedManifest.sourceCommit = 'c'.repeat(40);
    await writeFile(
      resolve(sourceDirectory, 'releases/0.1.26/manifest.json'),
      JSON.stringify(changedManifest),
    );

    // act
    const build = BuildDownloadSite({ sourceDirectory, outputDirectory });

    // assert
    await expect(build).rejects.toThrow(/does not match its preserved version metadata/u);
  });

  it('refuses to delete workspace roots', async () => {
    // arrange
    const rootDirectory = resolve('.');

    // act
    const build = BuildDownloadSite({ sourceDirectory, outputDirectory: rootDirectory });

    // assert
    await expect(build).rejects.toThrow(/dedicated directory below workspace out/u);
  });

  it('refuses to overwrite overlapping source directories', async () => {
    // arrange
    const nestedSource = resolve(outputDirectory, 'metadata');
    await writeMetadata(nestedSource);

    // act
    const buildOverSource = BuildDownloadSite({ sourceDirectory: nestedSource, outputDirectory });

    // assert
    await expect(buildOverSource).rejects.toThrow(/must not overlap/u);
    expect(await readFile(resolve(nestedSource, 'catalog.json'), 'utf8')).toBe(
      JSON.stringify(catalog),
    );
  });
});
