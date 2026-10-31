// #region Imports

import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// #endregion

// The publication step turns the platform build matrix into the exact installer-only
// ARM64 release surface. Both object-storage and flat GitHub Release layouts are
// exercised here, including ignored maker output that must never become a release asset.
const run = promisify(execFile);
const script = resolve('tools/prepare-update-publication.mjs');
const version = '0.42.1';

let workspace: string;
let inputRoot: string;
let outputRoot: string;

const artifactMatrix = [
  ['darwin/arm64', `Symphony-darwin-arm64-${version}.dmg`],
  ['win32/arm64', 'SymphonySetup.exe'],
  ['linux/arm64', `symphony_${version}_arm64.deb`],
] as const;

const disabledArtifactMatrix = [
  ['darwin/arm64', `Symphony-darwin-arm64-${version}.zip`],
  ['darwin/x64', `Symphony-darwin-x64-${version}.dmg`],
  ['darwin/x64', `Symphony-darwin-x64-${version}.zip`],
  ['win32/arm64', `symphony-${version}-full.nupkg`],
  ['win32/x64', 'SymphonySetup.exe'],
  ['linux/x64', `symphony_${version}_amd64.deb`],
] as const;

function publish(overrides: Record<string, string | undefined> = {}) {
  return run(process.execPath, [script], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_RELEASE_VERSION: version,
      SYMPHONY_UPDATE_CHANNEL: 'all',
      SYMPHONY_UPDATE_BASE_URL: 'https://updates.example.com',
      SYMPHONY_UPDATE_INPUT: inputRoot,
      SYMPHONY_UPDATE_OUTPUT: outputRoot,
      SYMPHONY_UPDATE_ARTIFACT_BASE_URL: undefined,
      GITHUB_SHA: 'a'.repeat(40),
      ...overrides,
    } as NodeJS.ProcessEnv,
  });
}

function readOutput(...segments: readonly string[]): string {
  return readFileSync(join(outputRoot, ...segments), 'utf8');
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'symphony-publication-'));
  inputRoot = join(workspace, 'input');
  // The output has to live inside the workspace the script runs in.
  outputRoot = resolve('out/update-publication-spec');
  for (const [directory, name] of [...artifactMatrix, ...disabledArtifactMatrix]) {
    const target = join(inputRoot, `update-${directory.replace('/', '-')}`, directory);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, name), `${name} payload`);
  }
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(outputRoot, { recursive: true, force: true });
});

describe('update publication', () => {
  it('places artifacts under an immutable version path by default', async () => {
    // arrange
    await publish();

    // act
    const manifest = JSON.parse(readOutput('releases', version, 'manifest.json'));
    // assert
    expect(manifest.version).toBe(version);
    expect(manifest.files).toHaveLength(artifactMatrix.length);
    expect(manifest.files.every((file: { sha256: string }) => file.sha256.length === 64)).toBe(
      true,
    );

    const macInstaller = manifest.files.find((file: { name: string }) =>
      file.name.endsWith('.dmg'),
    );
    expect(macInstaller.url).toBe(
      `https://updates.example.com/releases/${version}/darwin/arm64/Symphony-darwin-arm64-${version}.dmg`,
    );
  });

  it('addresses artifacts by flat name when a release asset origin is configured', async () => {
    // arrange
    await publish({
      SYMPHONY_UPDATE_ARTIFACT_BASE_URL: `https://github.com/owner/symphony/releases/download/v${version}`,
    });

    const manifest = JSON.parse(readOutput('releases', version, 'manifest.json'));
    // act
    const installer = manifest.files.find(
      (file: { name: string }) => file.name === 'SymphonySetup.exe',
    );
    // assert
    expect(installer.url).toBe(
      `https://github.com/owner/symphony/releases/download/v${version}/SymphonySetup.exe`,
    );
    expect(installer.platform).toBe('win32');
    expect(installer.architecture).toBe('arm64');

    // Only metadata belongs on the origin; the binaries are uploaded from the flat store.
    expect(() => readOutput('assets', 'SymphonySetup.exe')).not.toThrow();
    expect(() => readOutput('releases', version, 'win32', 'arm64', 'SymphonySetup.exe')).toThrow();
  });

  it('emits installer manifests without native ZIP or NuGet feeds', async () => {
    // arrange
    await publish({
      SYMPHONY_UPDATE_ARTIFACT_BASE_URL: `https://github.com/owner/symphony/releases/download/v${version}`,
    });

    // act
    const readMacFeed = () => readOutput('channels', 'stable', 'darwin', 'arm64', 'RELEASES.json');
    const readWindowsFeed = () => readOutput('channels', 'stable', 'win32', 'arm64', 'RELEASES');
    const stableMacInstaller = JSON.parse(
      readOutput('channels', 'stable', 'darwin', 'arm64', 'installer.json'),
    );
    const canaryWindowsInstaller = JSON.parse(
      readOutput('channels', 'canary', 'win32', 'arm64', 'installer.json'),
    );

    // assert
    expect(readMacFeed).toThrow();
    expect(readWindowsFeed).toThrow();
    expect(stableMacInstaller).toMatchObject({
      schemaVersion: 1,
      version,
      platform: 'darwin',
      architecture: 'arm64',
      artifact: {
        name: `Symphony-darwin-arm64-${version}.dmg`,
        url: `https://github.com/owner/symphony/releases/download/v${version}/Symphony-darwin-arm64-${version}.dmg`,
      },
    });
    expect(canaryWindowsInstaller).toMatchObject({
      version,
      platform: 'win32',
      architecture: 'arm64',
      artifact: { name: 'SymphonySetup.exe' },
    });
  });

  it('refuses to publish an incomplete platform matrix', async () => {
    // act
    // arrange
    rmSync(join(inputRoot, 'update-linux-arm64'), { recursive: true, force: true });

    // assert
    await expect(publish()).rejects.toThrow(/release matrix is incomplete/u);
  });

  it('requires the Apple Silicon disk image', async () => {
    // arrange
    rmSync(
      join(
        inputRoot,
        'update-darwin-arm64',
        'darwin/arm64',
        `Symphony-darwin-arm64-${version}.dmg`,
      ),
    );

    // act
    const publication = publish();

    // assert
    await expect(publication).rejects.toThrow(/macOS arm64 DMG/u);
  });

  it('ignores disabled ZIP, NuGet, and x64 maker output', async () => {
    // arrange
    await publish();

    // act
    const manifest = JSON.parse(readOutput('releases', version, 'manifest.json'));

    // assert
    expect(manifest.files.map((file: { name: string }) => file.name).sort()).toEqual(
      artifactMatrix.map(([, name]) => name).sort(),
    );
  });

  it('refuses an origin that carries credentials or is not HTTPS', async () => {
    // assert
    await expect(
      publish({ SYMPHONY_UPDATE_BASE_URL: 'http://updates.example.com' }),
    ).rejects.toThrow(/SYMPHONY_UPDATE_BASE_URL/u);
    await expect(
      publish({ SYMPHONY_UPDATE_ARTIFACT_BASE_URL: 'https://user:token@example.com/download' }),
    ).rejects.toThrow(/SYMPHONY_UPDATE_ARTIFACT_BASE_URL/u);
  });

  it('rejects a matrix whose artifacts would collide in the flat asset store', async () => {
    // arrange
    const collision = join(inputRoot, 'update-win32-arm64-copy', 'win32/arm64');
    mkdirSync(collision, { recursive: true });
    // act
    writeFileSync(join(collision, 'SymphonySetup.exe'), 'colliding payload');

    // assert
    await expect(
      publish({
        SYMPHONY_UPDATE_ARTIFACT_BASE_URL: `https://github.com/owner/symphony/releases/download/v${version}`,
      }),
    ).rejects.toThrow(/share the name/u);
  });
});
