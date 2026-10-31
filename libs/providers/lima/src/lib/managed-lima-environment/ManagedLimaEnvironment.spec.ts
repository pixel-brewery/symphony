// #region Imports

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ManagedLimaEnvironment } from './ManagedLimaEnvironment';
import { limaInstanceName } from './limaInstanceName';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const runnerName = limaInstanceName('sci', 'symphony-warm:repository-1');
const secondaryRunnerName = limaInstanceName('sci', 'symphony-warm:repository-2');

function createRuntimeRoot(): string {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'instance-overview-'));
  temporaryDirectories.push(runtimeRoot);
  const lima = join(runtimeRoot, 'tools', 'lima-2.2.0-arm64', 'bin', 'limactl');
  mkdirSync(join(lima, '..'), { recursive: true });
  writeFileSync(lima, '#!/bin/sh\nexit 0\n');
  chmodSync(lima, 0o700);
  return runtimeRoot;
}

/** Places an instance directory the way Lima leaves it behind, with its copied configuration. */
function createInstanceDirectory(runtimeRoot: string, name: string, diskGiB?: number): void {
  const directory = join(runtimeRoot, 'lima', name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'disk'), 'disk');
  if (diskGiB !== undefined) {
    writeFileSync(
      join(directory, 'lima.yaml'),
      ['vmType: vz', 'cpus: 6', 'memory: 12GiB', `disk: ${diskGiB}GiB`, ''].join('\n'),
    );
  }
  writeFileSync(join(runtimeRoot, `${name}.yaml`), 'vmType: vz\n');
}

function createEnvironment(
  listed: readonly { readonly name: string; readonly status: string }[],
  calls: string[][] = [],
): ManagedLimaEnvironment {
  return new ManagedLimaEnvironment({
    platform: 'darwin',
    architecture: 'arm64',
    execute: async (_executable, arguments_) => {
      calls.push([...arguments_]);
      if (arguments_[0] === 'list') {
        return listed.map((instance) => JSON.stringify(instance)).join('\n');
      }
      return '';
    },
  });
}

describe('ManagedLimaEnvironment', () => {
  it('keeps managed virtual machines unavailable on a Windows host', () => {
    // arrange
    const environment = new ManagedLimaEnvironment({ platform: 'win32' });

    // act + assert
    expect(environment.isSupportedHost()).toBe(false);
    expect(() => environment.assertSupportedHost()).toThrow();
  });

  it('reports every managed machine on disk with its purpose, status, and provisioned size', async () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    createInstanceDirectory(runtimeRoot, runnerName, 22);
    createInstanceDirectory(runtimeRoot, secondaryRunnerName, 20);
    const environment = createEnvironment([
      { name: runnerName, status: 'Running' },
      { name: secondaryRunnerName, status: 'Stopped' },
    ]);

    // act
    const instances = await environment.instances(runtimeRoot, new AbortController().signal);

    // assert
    expect(instances).toEqual([
      expect.objectContaining({
        name: runnerName,
        purpose: 'workflow-runner',
        status: 'running',
        provisionedDiskGiB: 22,
      }),
      expect.objectContaining({
        name: secondaryRunnerName,
        purpose: 'workflow-runner',
        status: 'stopped',
        provisionedDiskGiB: 20,
      }),
    ]);
  });

  it('reports a directory Lima no longer tracks, because its disk still occupies the budget', async () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    createInstanceDirectory(runtimeRoot, secondaryRunnerName, 20);
    const environment = createEnvironment([]);

    // act
    const [instance] = await environment.instances(runtimeRoot, new AbortController().signal);

    // assert
    expect(instance?.status).toBe('missing');
  });

  it('ignores directories Symphony cannot have created', async () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    createInstanceDirectory(runtimeRoot, 'docker-desktop');
    createInstanceDirectory(runtimeRoot, '_config');
    const environment = createEnvironment([{ name: 'docker-desktop', status: 'Running' }]);

    // act
    const actual = await environment.instances(runtimeRoot, new AbortController().signal);

    // assert
    expect(actual).toEqual([]);
  });

  it('stops, deletes, and forgets the configuration of a machine it removes', async () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    createInstanceDirectory(runtimeRoot, secondaryRunnerName, 20);
    const calls: string[][] = [];
    const environment = createEnvironment(
      [{ name: secondaryRunnerName, status: 'Stopped' }],
      calls,
    );
    // A real `limactl delete` removes the directory; the stub only records the call.
    rmSync(join(runtimeRoot, 'lima', secondaryRunnerName), { recursive: true, force: true });

    // act
    const removed = await environment.removeInstance(
      runtimeRoot,
      secondaryRunnerName,
      new AbortController().signal,
    );

    // assert
    expect(removed).toBe(true);
    expect(calls).toContainEqual(['stop', '--force', secondaryRunnerName]);
    expect(calls).toContainEqual(['delete', '--force', secondaryRunnerName]);
    expect(existsSync(join(runtimeRoot, `${secondaryRunnerName}.yaml`))).toBe(false);
  });

  it('reports failure and keeps the configuration when the disk survives the delete', async () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    createInstanceDirectory(runtimeRoot, secondaryRunnerName, 20);
    const environment = createEnvironment([{ name: secondaryRunnerName, status: 'Stopped' }]);

    // act
    const removed = await environment.removeInstance(
      runtimeRoot,
      secondaryRunnerName,
      new AbortController().signal,
    );

    // assert
    expect(removed).toBe(false);
    expect(existsSync(join(runtimeRoot, `${secondaryRunnerName}.yaml`))).toBe(true);
  });

  it('refuses a name outside the managed namespace', async () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    // act
    const environment = createEnvironment([]);

    // assert
    await expect(
      environment.removeInstance(runtimeRoot, '../../etc', new AbortController().signal),
    ).rejects.toThrow('managed');
  });
});
