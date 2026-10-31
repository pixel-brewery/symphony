// #region Imports

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { resolveLocalCiResourcePreset } from '@symphony/domain-ci';
import { workspaceStorageDirectoryName } from '@symphony/persistence-core';
import { StorageGovernor } from './';

// #endregion

const temporaryDirectories: string[] = [];

const TEST_AVAILABLE_FILESYSTEM_BYTES = 100 * 1024 ** 3;

// Removing the 11,000-file tree of the oversized-tree case takes longer than the default hook
// timeout on Windows runners.
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true, maxRetries: 3 });
  }
}, 60_000);

describe('StorageGovernor', () => {
  it('resolves VM profiles against detected host and storage capacity', () => {
    // act
    const actual = resolveLocalCiResourcePreset('performance', {
      logicalCpus: 18,
      memoryGiB: 64,
      availableStorageGiB: 100,
      storageLimitGiB: 32,
    });

    // assert
    expect(actual).toEqual({
      supported: true,
      resources: { cpus: 8, memoryGiB: 16, diskGiB: 22, cacheGiB: 8 },
    });
    expect(
      resolveLocalCiResourcePreset('compact', {
        logicalCpus: 2,
        memoryGiB: 8,
        availableStorageGiB: 100,
        storageLimitGiB: 32,
      }),
    ).toMatchObject({ supported: false, resources: { cpus: 0 } });
    expect(
      resolveLocalCiResourcePreset(
        'custom',
        {
          logicalCpus: 18,
          memoryGiB: 64,
          availableStorageGiB: 100,
          storageLimitGiB: 32,
        },
        { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
      ),
    ).toEqual({
      supported: true,
      resources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
    });
    expect(
      resolveLocalCiResourcePreset(
        'custom',
        {
          logicalCpus: 18,
          memoryGiB: 64,
          availableStorageGiB: 100,
          storageLimitGiB: 32,
        },
        { cpus: 4, memoryGiB: 8, diskGiB: 27, cacheGiB: 4 },
      ),
    ).toMatchObject({ supported: false });
    expect(
      resolveLocalCiResourcePreset(
        'custom',
        {
          logicalCpus: 18,
          memoryGiB: 64,
          availableStorageGiB: 100,
          storageLimitGiB: 32,
        },
        { cpus: 4, memoryGiB: 2, diskGiB: 24, cacheGiB: 4 },
      ),
    ).toMatchObject({ supported: false });
  });

  it('reports workspace, local CI, global and filesystem pressure independently', () => {
    // arrange
    const root = temporaryDirectory();
    const settings = createDefaultApplicationSettings(root);
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
      availableParallelism: () => 10,
      totalMemoryBytes: () => 32 * 1024 ** 3,
    });

    // act
    const status = governor.report();

    // assert
    expect(status.error).toBeUndefined();
    expect(status.measured).toBe(true);
    expect(status.global.pressure).toBe('healthy');
    expect(status.localCi.limitBytes).toBe(32 * 1024 ** 3);
    expect(status.workspaces).toEqual([
      expect.objectContaining({ workspaceId: 'personal', pressure: 'healthy' }),
    ]);
    expect(status.filesystem.availableBytes).toBeGreaterThan(0);
    expect(status.localCiCapacity).toMatchObject({
      logicalCpus: 10,
      totalMemoryBytes: 32 * 1024 ** 3,
      presets: { compact: { supported: true } },
    });
  });

  it('fails closed when a workspace has no write headroom', () => {
    // arrange
    const root = temporaryDirectory();
    const defaults = createDefaultApplicationSettings(root);
    const settings = {
      ...defaults,
      workspaces: defaults.workspaces.map((workspace) => ({
        ...workspace,
        storageLimitGiB: 2,
      })),
    };
    // act
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    // assert
    expect(() =>
      governor.assertWritable({ workspaceId: 'personal', requiredBytes: 3 * 1024 ** 3 }),
    ).toThrow('Storage safety stop');
  });

  it('defers analysis before it consumes the implementation and local-build reserve', () => {
    // arrange
    const root = temporaryDirectory();
    const defaults = createDefaultApplicationSettings(root);
    const settings = {
      ...defaults,
      runtime: { ...defaults.runtime, managedStorageLimitGiB: 100 },
      workspaces: defaults.workspaces.map((workspace) => ({
        ...workspace,
        storageLimitGiB: 7,
      })),
    };
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    // act
    const genericWrite = (): void => void governor.assertWritable({ workspaceId: 'personal' });
    const analysis = (): void =>
      void governor.assertWritable({ workspaceId: 'personal', workload: 'analysis' });

    // assert
    expect(genericWrite).not.toThrow();
    expect(analysis).toThrow('Storage safety stop: Personal');
  });

  it('keeps reporting immediately on an oversized tree and measures it in the background', async () => {
    const root = temporaryDirectory();
    const defaults = createDefaultApplicationSettings(root);
    mkdirSync(join(root, '.symphony'), { recursive: true });
    const workspaceRoot = join(
      defaults.runtime.workspaceRoot,
      workspaceStorageDirectoryName('personal'),
    );
    for (let directory = 0; directory < 11; directory += 1) {
      const parent = join(workspaceRoot, `bulk-${directory}`);
      mkdirSync(parent, { recursive: true });
      for (let file = 0; file < 1_000; file += 1) {
        writeFileSync(join(parent, `file-${file}`), 'x');
      }
    }
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => defaults,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    // Past the inline entry budget the first report must not walk the tree synchronously: it
    // answers immediately, and says outright that nothing has been measured yet. Reporting the
    // placeholder 0 as if it were a measurement is what makes a settings page claim an empty
    // disk while a multi-gigabyte tree is still being counted.
    const first = governor.report();
    expect(first.error).toBeUndefined();
    expect(first.measured).toBe(false);
    expect(first.global.allocatedBytes).toBe(0);
    expect(() => governor.assertWritable({ workload: 'local-ci' })).not.toThrow();

    const measured = await eventually(() => {
      const report = governor.report();
      const workspace = report.workspaces[0];
      return report.measured && workspace && workspace.allocatedBytes > 0 ? workspace : undefined;
    });
    expect(measured.allocatedBytes).toBeGreaterThan(11_000);
    expect(governor.report().measured).toBe(true);

    // Inside the TTL the cached measurement is served without another walk.
    writeFileSync(join(workspaceRoot, 'late-addition.bin'), Buffer.alloc(1024 * 1024));
    expect(governor.report().workspaces[0]?.allocatedBytes).toBe(measured.allocatedBytes);

    // A restart serves the last completed inventory immediately instead of repeating the inode
    // walk before it can admit a bounded local build.
    const restartedGovernor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => defaults,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });
    expect(restartedGovernor.report().measured).toBe(true);
    // Writing and walking 11,000 files takes about 40 s on Windows runners.
  }, 120_000);

  it('splits every usage group into the categories that physically fill it', () => {
    // arrange
    const root = temporaryDirectory();
    const settings = createDefaultApplicationSettings(root);
    const workspaceRoot = join(
      settings.runtime.workspaceRoot,
      workspaceStorageDirectoryName('personal'),
    );
    const localCiRoot = join(settings.runtime.workspaceRoot, 'local-ci');
    writeBytes(join(workspaceRoot, 'repositories', 'clone.bin'), 128 * 1024);
    writeBytes(join(workspaceRoot, 'executions', 'worktree.bin'), 256 * 1024);
    writeBytes(join(workspaceRoot, 'state.sqlite'), 64 * 1024);
    writeBytes(join(localCiRoot, 'tools', 'runner.bin'), 512 * 1024);
    writeBytes(join(localCiRoot, 'cache', 'lima-downloads', 'base.img'), 192 * 1024);
    writeBytes(join(root, '.symphony', 'state.sqlite'), 32 * 1024);
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    const status = governor.report();
    const bytesOf = (
      usage: { readonly segments: readonly { id: string; allocatedBytes: number }[] },
      id: string,
    ) => usage.segments.find((segment) => segment.id === id)?.allocatedBytes ?? 0;
    // act
    const workspace = status.workspaces[0];

    // assert
    expect(workspace).toBeDefined();
    expect(bytesOf(workspace!, 'repositories')).toBeGreaterThanOrEqual(128 * 1024);
    expect(bytesOf(workspace!, 'executions')).toBeGreaterThanOrEqual(256 * 1024);
    expect(bytesOf(workspace!, 'database')).toBeGreaterThanOrEqual(64 * 1024);
    expect(bytesOf(workspace!, 'verification')).toBe(0);
    expect(bytesOf(status.localCi, 'runner-tools')).toBeGreaterThanOrEqual(512 * 1024);
    expect(bytesOf(status.localCi, 'base-image')).toBeGreaterThanOrEqual(192 * 1024);
    expect(bytesOf(status.localCi, 'instances')).toBe(0);

    // The global bar reuses the very same measurement: its workspace and runner shares match
    // the dedicated bars, and application state is whatever neither of them claimed.
    expect(bytesOf(status.global, 'workspaces')).toBe(workspace!.allocatedBytes);
    expect(bytesOf(status.global, 'local-ci')).toBe(status.localCi.allocatedBytes);
    expect(bytesOf(status.global, 'application-state')).toBeGreaterThanOrEqual(32 * 1024);
    expect(
      status.global.segments.reduce((total, segment) => total + segment.allocatedBytes, 0),
    ).toBe(status.global.allocatedBytes);
  });

  it('names how many machines fill the instance segment', () => {
    // arrange
    const root = temporaryDirectory();
    const settings = createDefaultApplicationSettings(root);
    const limaRoot = join(settings.runtime.workspaceRoot, 'local-ci', 'lima');
    writeBytes(join(limaRoot, 'sci-0123456789abcdef', 'disk'), 64 * 1024);
    writeBytes(join(limaRoot, 'sci-fedcba9876543210', 'disk'), 64 * 1024);
    writeBytes(join(limaRoot, '_config', 'user'), 1024);
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    // act
    const instances = governor
      .report()
      .localCi.segments.find((segment) => segment.id === 'instances');

    // One number cannot tell an operator that a second machine was left behind; the tooltip has to.
    // assert
    expect(instances?.description).toContain('2 machines');
  });

  it('reflects a deletion immediately once the measurement is invalidated', () => {
    // arrange
    const root = temporaryDirectory();
    const settings = createDefaultApplicationSettings(root);
    const disk = join(settings.runtime.workspaceRoot, 'local-ci', 'lima', 'sci-01', 'disk');
    writeBytes(disk, 4 * 1024 * 1024);
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });
    const before = governor.report().localCi.allocatedBytes;
    // act
    rmSync(disk, { force: true });

    // assert
    expect(governor.report().localCi.allocatedBytes).toBe(before);

    governor.invalidate();

    expect(governor.report().localCi.allocatedBytes).toBeLessThan(before);
  });

  it('reports a workspace as critical once physical allocation reaches 95 percent', () => {
    // arrange
    const root = temporaryDirectory();
    const defaults = createDefaultApplicationSettings(root);
    const workspaceRoot = join(
      defaults.runtime.workspaceRoot,
      workspaceStorageDirectoryName('personal'),
    );
    mkdirSync(workspaceRoot, { recursive: true });
    writeFileSync(join(workspaceRoot, 'physical-cache.bin'), Buffer.alloc(64 * 1024));
    const settings = {
      ...defaults,
      workspaces: defaults.workspaces.map((workspace) => ({
        ...workspace,
        storageLimitGiB: 0.000_01,
      })),
    };
    // act
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    // assert
    expect(governor.report().workspaces[0]).toMatchObject({
      workspaceId: 'personal',
      pressure: 'critical',
      usagePercent: 100,
    });
  });

  it('blocks writes at the same critical threshold reported by the storage status', () => {
    // arrange
    const root = temporaryDirectory();
    const defaults = createDefaultApplicationSettings(root);
    writeBytes(join(root, '.symphony', 'physical-cache.bin'), 64 * 1024);
    const settings = {
      ...defaults,
      runtime: {
        ...defaults.runtime,
        managedStorageLimitGiB: 0.000_01,
      },
    };
    const governor = new StorageGovernor({
      configurationRoot: join(root, '.symphony'),
      settings: () => settings,
      availableFilesystemBytes: () => TEST_AVAILABLE_FILESYSTEM_BYTES,
    });

    // act
    const status = governor.report();

    // assert
    expect(status.writable).toBe(false);
    expect(status.global.pressure).toBe('critical');
    expect(() => governor.assertWritable()).toThrow('Storage safety stop: Application storage');
  });
});

function writeBytes(path: string, bytes: number): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.alloc(bytes));
}

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-storage-governor-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function eventually<T>(probe: () => T | undefined): Promise<T> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const value = probe();
    if (value !== undefined) return value;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  throw new Error('Condition was not met in time.');
}
