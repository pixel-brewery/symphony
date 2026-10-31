// #region Imports

import { spawn } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IRunnerImageDefinition } from '@symphony/domain-core';
import { ManagedLimaGithubRunner } from './ManagedLimaGithubRunner';
import { guestFingerprint } from '../managed-lima-environment/guestFingerprint';
import { limaInstanceName } from '../managed-lima-environment/limaInstanceName';

// #endregion

const testImage: IRunnerImageDefinition = {
  releaseTag: 'ubuntu24-arm64/20260817.96',
  architecture: 'arm64',
  ubuntuVersion: '24.04',
  ubuntuCodename: 'noble',
  cloudImageRelease: '20260725',
  cloudImageFile: 'ubuntu-24.04-server-cloudimg-arm64.img',
  cloudImageSha256: '2eaec7286c49fdea713dddabcf5012cafa7097a658e916acb48f4bc5fdc8e419',
  aptPackages: ['fonts-noto-color-emoji', 'jq', 'libgbm-dev', 'xvfb'],
  nodeVersion: '24.15.0',
  nodeArchive: 'node-v24.15.0-linux-arm64.tar.xz',
  nodeSha256: 'f3d5a797b5d210ce8e2cb265544c8e482eaedcb8aa409a8b46da7e8595d0dda0',
  environment: { GECKOWEBDRIVER: '/usr/local/share/gecko_driver' },
  resolvedAt: '2026-08-21T20:00:00.000Z',
};

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('ManagedLimaGithubRunner', () => {
  it('starts an isolated workflow-scoped VM without exposing the registration token', async () => {
    // arrange
    const runtimeRoot = mkdtempSync(join(tmpdir(), 'managed-lima-runner-'));
    temporaryDirectories.push(runtimeRoot);
    const lima = join(runtimeRoot, 'tools', 'lima-2.2.0-arm64', 'bin', 'limactl');
    mkdirSync(join(lima, '..'), { recursive: true });
    writeFileSync(lima, '#!/bin/sh\nexit 0\n');
    chmodSync(lima, 0o700);
    const executions: readonly string[][] = [];
    const executionCalls = executions as string[][];
    const executionEnvironments: NodeJS.ProcessEnv[] = [];
    const spawnCalls: string[][] = [];
    let vmConfiguration = '';
    const guestAssetsRoot = join(runtimeRoot, 'test-guest-assets');
    mkdirSync(guestAssetsRoot, { recursive: true });
    const runnerArchive = join(guestAssetsRoot, 'runner.tar.gz');
    const cacheServerArchive = join(guestAssetsRoot, 'cache-server.tar.gz');
    writeFileSync(runnerArchive, 'runner');
    writeFileSync(cacheServerArchive, 'cache-server');
    mkdirSync(join(runtimeRoot, 'tools', 'node-24.15.0-arm64'), { recursive: true });
    writeFileSync(
      join(runtimeRoot, 'tools', 'node-24.15.0-arm64', 'node-v24.15.0-linux-arm64.tar.xz'),
      'node',
    );
    const runner = new ManagedLimaGithubRunner({
      platform: 'darwin',
      architecture: 'arm64',
      prepareGuestAssets: async () => ({
        root: guestAssetsRoot,
        runnerArchive,
        cacheServerArchive,
      }),
      execute: async (_executable, arguments_, environment) => {
        executionCalls.push([...arguments_]);
        executionEnvironments.push(environment);
        if (arguments_[0] === 'start') {
          const configurationPath = arguments_.at(-1);
          if (configurationPath) vmConfiguration = readFileSync(configurationPath, 'utf8');
        }
        return '';
      },
      spawn: (_executable, arguments_) => {
        spawnCalls.push([...arguments_]);
        return arguments_.some((argument) => argument.includes('cat >'))
          ? spawn(process.execPath, ['-e', 'process.stdin.resume();'])
          : spawn(process.execPath, ['-e', '']);
      },
    });

    const session = await runner.start(
      {
        repositoryUrl: 'https://github.com/flamox/platform',
        registrationToken: 'registration-token-that-must-stay-secret',
        runnerName: 'symphony-31863236976-d3ec04e72565',
        labels: ['symphony-local-ci', 'symphony-run-203'],
        runtimeRoot,
        resources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
        storageLimitGiB: 32,
        minimumFreeDiskGiB: 5,
        image: testImage,
        setupScript: 'corepack prepare yarn@4.10.3 --activate\n',
      },
      new AbortController().signal,
    );
    await session.completion;
    // act
    await session.stop();

    // assert
    expect(session).toMatchObject({
      os: 'linux',
      architecture: 'arm64',
      imageVersion:
        'ubuntu-24.04-20260725@sha256:2eaec7286c49fdea713dddabcf5012cafa7097a658e916acb48f4bc5fdc8e419/lima-2.2.0/runner-image-ubuntu24-arm64-20260817.96/node-24.15.0/actions-runner-2.336.0-local-cache/action-cache-server-1.1.2',
    });
    const startCall = executionCalls.find((arguments_) => arguments_[0] === 'start');
    const vmName = startCall
      ?.find((argument) => argument.startsWith('--name='))
      ?.slice('--name='.length);
    expect(vmName).toMatch(/^sci-[0-9a-f]{16}$/u);
    expect(startCall).toEqual(
      expect.arrayContaining([expect.stringMatching(/sci-[0-9a-f]{16}\.yaml$/u)]),
    );
    expect(startCall).not.toContain('--mount-none');
    const limaHome = executionEnvironments.find((environment) => environment['LIMA_HOME'])?.[
      'LIMA_HOME'
    ];
    expect(limaHome).toMatch(/symphony-lima-[0-9a-f]{16}$/u);
    if (process.platform === 'win32') {
      expect(dirname(limaHome ?? '')).toBe(tmpdir());
    } else {
      expect(limaHome).toMatch(/^\/tmp\/symphony-lima-[0-9a-f]{16}$/u);
      expect(
        Buffer.byteLength(join(limaHome ?? '', vmName ?? '', 'ssh.sock.1234567890123456')),
      ).toBeLessThan(104);
    }
    expect(executionEnvironments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          HOME: join(runtimeRoot, 'home'),
          XDG_CACHE_HOME: join(runtimeRoot, 'cache', 'lima-downloads'),
          TMPDIR: join(runtimeRoot, 'tmp'),
        }),
      ]),
    );
    expect(join(executionEnvironments[0]?.['HOME'] ?? '', 'Library', 'Caches', 'lima')).toBe(
      join(runtimeRoot, 'home', 'Library', 'Caches', 'lima'),
    );
    expect(vmConfiguration).toContain(
      'digest: sha256:2eaec7286c49fdea713dddabcf5012cafa7097a658e916acb48f4bc5fdc8e419',
    );
    expect(vmConfiguration).toContain('cpus: 4');
    expect(vmConfiguration).toContain('memory: 8GiB');
    expect(vmConfiguration).toContain('disk: 24GiB');
    expect(vmConfiguration).toContain(`location: ${JSON.stringify(realpathSync(guestAssetsRoot))}`);
    expect(vmConfiguration).toContain('mountPoint: /var/lib/symphony-local-ci/tools');
    const cacheMount =
      /location: ("[^\n]+")\n {4}mountPoint: \/var\/lib\/symphony-local-ci\/cache\n {4}writable: true/u.exec(
        vmConfiguration,
      );
    expect(cacheMount).not.toBeNull();
    const cacheLocation = JSON.parse(cacheMount?.[1] ?? '""') as string;
    expect(dirname(cacheLocation)).toBe(realpathSync(join(runtimeRoot, 'cache', 'repositories')));
    expect(basename(cacheLocation)).toMatch(/^[0-9a-f]{32}$/u);
    expect(executionCalls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(['stop', '--force', vmName]),
        expect.arrayContaining(['delete', '--force', vmName]),
      ]),
    );
    expect(JSON.stringify({ executionCalls, spawnCalls })).not.toContain(
      'registration-token-that-must-stay-secret',
    );
    const runnerConfiguration = JSON.stringify(executionCalls);
    expect(runnerConfiguration).toContain('./config.sh --unattended --disableupdate --replace');
    expect(runnerConfiguration).not.toContain('--ephemeral');
    expect(runnerConfiguration).toContain('CACHE_MAX_SIZE_BYTES=4294967296');
    expect(runnerConfiguration).toContain('Environment=ADDR=127.0.0.1:65432');
    expect(runnerConfiguration).not.toContain('127.0.0.1:3000');
    expect(runnerConfiguration).toContain('sudo fallocate -l 4G /swapfile');
    expect(runnerConfiguration).toContain("'ACTIONS_RESULTS_URL': 'LOCALCI_RESULTS_URL'");
    expect(runnerConfiguration).toContain("'ACTIONS_CACHE_URL': 'LOCALCI_CACHE_URL'");
    expect(runnerConfiguration).toContain('action-cache-server');
    expect(spawnCalls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          'ACTIONS_RESULTS_URL=http://127.0.0.1:65432/',
          'ACTIONS_CACHE_URL=http://127.0.0.1:65432/',
          '/opt/actions-runner/run.sh',
        ]),
      ]),
    );
    const provisioning = JSON.stringify(executionCalls);
    expect(provisioning).toContain(
      'if ! apt-get install -y fonts-noto-color-emoji jq libgbm-dev xvfb',
    );
    expect(provisioning).toContain('for package in fonts-noto-color-emoji jq libgbm-dev xvfb');
    expect(provisioning).toContain('node-v24.15.0-linux-arm64.tar.xz');
    expect(provisioning).toContain("export GECKOWEBDRIVER='/usr/local/share/gecko_driver'");
    expect(provisioning).toContain('locale-gen en_US.UTF-8');
    expect(provisioning).toContain('fs.inotify.max_user_watches=524288');
    expect(vmConfiguration).toContain('mountPoint: /var/lib/symphony-local-ci/node');
    expect(provisioning).toContain('bash /var/tmp/symphony-setup-script.sh');
  });

  it('removes only abandoned managed instances and their configuration files', async () => {
    // arrange
    const runtimeRoot = mkdtempSync(join(tmpdir(), 'managed-lima-cleanup-'));
    temporaryDirectories.push(runtimeRoot);
    const lima = join(runtimeRoot, 'tools', 'lima-2.2.0-arm64', 'bin', 'limactl');
    mkdirSync(join(lima, '..'), { recursive: true });
    writeFileSync(lima, '#!/bin/sh\nexit 0\n');
    chmodSync(lima, 0o700);
    const managedName = 'sci-0123456789abcdef';
    const unrelatedName = 'personal-development';
    mkdirSync(join(runtimeRoot, 'lima', managedName), { recursive: true });
    mkdirSync(join(runtimeRoot, 'lima', unrelatedName), { recursive: true });
    writeFileSync(join(runtimeRoot, `${managedName}.yaml`), 'managed');
    writeFileSync(join(runtimeRoot, 'unrelated.yaml'), 'unrelated');
    const calls: string[][] = [];
    // act
    const runner = new ManagedLimaGithubRunner({
      platform: 'darwin',
      architecture: 'arm64',
      execute: async (_executable, arguments_) => {
        calls.push([...arguments_]);
        if (arguments_[0] === 'delete') {
          rmSync(join(runtimeRoot, 'lima', managedName), { recursive: true, force: true });
        }
        return '';
      },
    });

    // assert
    await expect(runner.cleanup(runtimeRoot, new AbortController().signal)).resolves.toEqual({
      removedInstances: 1,
      failedInstances: 0,
      removedConfigurationFiles: 1,
    });
    expect(calls).toEqual([
      ['stop', '--force', managedName],
      ['delete', '--force', managedName],
    ]);
    expect(readFileSync(join(runtimeRoot, 'unrelated.yaml'), 'utf8')).toBe('unrelated');
  });
});

const warmTemporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of warmTemporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const warmImage: IRunnerImageDefinition = {
  releaseTag: 'ubuntu24-arm64/20260817.96',
  architecture: 'arm64',
  ubuntuVersion: '24.04',
  ubuntuCodename: 'noble',
  cloudImageRelease: '20260725',
  cloudImageFile: 'ubuntu-24.04-server-cloudimg-arm64.img',
  cloudImageSha256: 'a'.repeat(64),
  aptPackages: ['jq', 'xvfb'],
  nodeVersion: '24.15.0',
  nodeArchive: 'node-v24.15.0-linux-arm64.tar.xz',
  nodeSha256: 'b'.repeat(64),
  environment: {},
  resolvedAt: '2026-08-21T20:00:00.000Z',
};

function createWarmRuntimeRoot(): string {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'warm-reuse-'));
  warmTemporaryDirectories.push(runtimeRoot);
  const lima = join(runtimeRoot, 'tools', 'lima-2.2.0-arm64', 'bin', 'limactl');
  mkdirSync(join(lima, '..'), { recursive: true });
  writeFileSync(lima, '#!/bin/sh\nexit 0\n');
  chmodSync(lima, 0o700);
  mkdirSync(join(runtimeRoot, 'tools', 'node-24.15.0-arm64'), { recursive: true });
  writeFileSync(
    join(runtimeRoot, 'tools', 'node-24.15.0-arm64', 'node-v24.15.0-linux-arm64.tar.xz'),
    'node',
  );
  const guestAssets = join(runtimeRoot, 'guest-assets');
  mkdirSync(guestAssets, { recursive: true });
  writeFileSync(join(guestAssets, 'runner.tar.gz'), 'runner');
  writeFileSync(join(guestAssets, 'cache-server.tar.gz'), 'cache-server');
  return runtimeRoot;
}

interface IWarmHarness {
  readonly calls: string[][];
  readonly runner: ManagedLimaGithubRunner;
  readonly runtimeRoot: string;
}

/** Simulates a Lima host where the named instance already exists with a recorded fingerprint. */
function createWarmHarness(existing?: { status: string; fingerprint: string }): IWarmHarness {
  const runtimeRoot = createWarmRuntimeRoot();
  const calls: string[][] = [];
  const warmInstanceName = limaInstanceName('sci', 'symphony-warm:repository-1');
  const runner = new ManagedLimaGithubRunner({
    platform: 'darwin',
    architecture: 'arm64',
    prepareGuestAssets: async () => ({
      root: join(runtimeRoot, 'guest-assets'),
      runnerArchive: join(runtimeRoot, 'guest-assets', 'runner.tar.gz'),
      cacheServerArchive: join(runtimeRoot, 'guest-assets', 'cache-server.tar.gz'),
    }),
    execute: async (_executable, arguments_) => {
      calls.push([...arguments_]);
      if (arguments_[0] === 'list') {
        return existing ? JSON.stringify({ name: warmInstanceName, status: existing.status }) : '';
      }
      if (arguments_.includes('cat')) return existing?.fingerprint ?? '';
      return '';
    },
    spawn: (_executable, arguments_) =>
      arguments_.some((argument) => argument.includes('cat >'))
        ? spawn(process.execPath, ['-e', 'process.stdin.resume();'])
        : spawn(process.execPath, ['-e', '']),
  });
  return { calls, runner, runtimeRoot };
}

async function startWarmRun(harness: IWarmHarness, reuse: boolean): Promise<void> {
  const session = await harness.runner.start(
    {
      repositoryUrl: 'https://github.com/ruederennes/flamox',
      registrationToken: 'registration-token-that-must-stay-secret',
      runnerName: 'symphony-203-abcdef012345',
      labels: ['symphony-local-ci', 'symphony-run-203'],
      runtimeRoot: harness.runtimeRoot,
      resources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
      storageLimitGiB: 32,
      minimumFreeDiskGiB: 5,
      image: warmImage,
      ...(reuse ? { reuse: true, warmInstanceKey: 'symphony-warm:repository-1' } : {}),
    },
    new AbortController().signal,
  );
  await session.completion;
  await session.stop();
}

describe('ManagedLimaGithubRunner warm reuse', () => {
  it('creates and provisions a machine when none is warm yet', async () => {
    // arrange
    const harness = createWarmHarness();

    await startWarmRun(harness, true);

    // act
    const transcript = JSON.stringify(harness.calls);
    // assert
    expect(transcript).toContain('start');
    expect(transcript).toContain('apt-get update');
    expect(transcript).toContain('symphony-guest-fingerprint');
  });

  it('resets and reuses a running machine whose guest definition is unchanged', async () => {
    // arrange
    const harness = createWarmHarness({
      status: 'Running',
      fingerprint: guestFingerprint(warmImage),
    });

    await startWarmRun(harness, true);

    // act
    const transcript = JSON.stringify(harness.calls);
    // assert
    expect(transcript).toContain('Warm guest reset complete.');
    expect(transcript).toContain('docker rm --force');
    expect(transcript).not.toContain('apt-get update');
    expect(harness.calls.filter((call) => call[0] === 'start' && call[1] === '--yes')).toHaveLength(
      0,
    );
  });

  it('returns the blocks it freed inside the guest to the Mac', async () => {
    // arrange
    const harness = createWarmHarness({
      status: 'Running',
      fingerprint: guestFingerprint(warmImage),
    });

    // act
    await startWarmRun(harness, true);

    // Deleting inside the guest frees nothing on the host: the instance disk is a sparse file
    // that only shrinks when the guest discards the freed blocks. Without this a warm machine
    // ratchets up to its full provisioned size over repeated runs.
    // assert
    expect(JSON.stringify(harness.calls)).toContain('fstrim');
  });

  it('recreates the machine when the guest definition changed', async () => {
    // arrange
    const harness = createWarmHarness({ status: 'Running', fingerprint: 'c'.repeat(64) });

    await startWarmRun(harness, true);

    // act
    const transcript = JSON.stringify(harness.calls);
    // assert
    expect(transcript).toContain('delete');
    expect(transcript).toContain('apt-get update');
  });

  it('keeps the machine after a run instead of deleting it', async () => {
    // arrange
    const harness = createWarmHarness({
      status: 'Running',
      fingerprint: guestFingerprint(warmImage),
    });

    // act
    await startWarmRun(harness, true);

    // assert
    expect(harness.calls.some((call) => call[0] === 'delete')).toBe(false);
    expect(harness.calls.some((call) => call[0] === 'stop' && call[1] !== '--force')).toBe(true);
  });

  it('still destroys the machine when reuse is disabled', async () => {
    // arrange
    const harness = createWarmHarness();

    // act
    await startWarmRun(harness, false);

    // assert
    expect(harness.calls.some((call) => call[0] === 'delete' && call[1] === '--force')).toBe(true);
    expect(harness.calls.some((call) => call[0] === 'list')).toBe(false);
  });

  it('leaves a preserved warm instance in place while reconciling abandoned ones', async () => {
    // arrange
    const runtimeRoot = createWarmRuntimeRoot();
    const warm = 'sci-0123456789abcdef';
    const abandoned = 'sci-fedcba9876543210';
    mkdirSync(join(runtimeRoot, 'lima', warm), { recursive: true });
    mkdirSync(join(runtimeRoot, 'lima', abandoned), { recursive: true });
    const removals: string[][] = [];
    const runner = new ManagedLimaGithubRunner({
      platform: 'darwin',
      architecture: 'arm64',
      execute: async (_executable, arguments_) => {
        removals.push([...arguments_]);
        if (arguments_[0] === 'delete') {
          rmSync(join(runtimeRoot, 'lima', arguments_[2] ?? ''), { recursive: true, force: true });
        }
        return '';
      },
    });

    // act
    const result = await runner.cleanup(runtimeRoot, new AbortController().signal, [warm]);

    // assert
    expect(result).toMatchObject({ removedInstances: 1, failedInstances: 0 });
    expect(removals.flat()).toContain(abandoned);
    expect(removals.flat()).not.toContain(warm);
  });
});
