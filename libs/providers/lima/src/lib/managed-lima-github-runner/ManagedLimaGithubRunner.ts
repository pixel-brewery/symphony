// #region Imports

import {
  COMMAND_TIMEOUT_MILLISECONDS,
  type IManagedLimaEnvironmentOptions,
  type IManagedLimaInstanceDescription,
  type IManagedLimaSession,
  localCiSwapGiB,
  ManagedLimaEnvironment,
  managedLimaImageVersion,
  processCompletion,
  secretSafeError,
  terminate,
} from '../managed-lima-environment';
import { mkdirSync, realpathSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { type IRunnerImageDefinition } from '@symphony/domain-core';
import { localCiResourceMinimums } from '@symphony/domain-ci';
import { ACTIONS_RUNNER_VERSION } from './ActionsRunnerVersion';
import { ACTION_CACHE_SERVER_PORT } from './ActionCacheServerPort';
import { ACTION_CACHE_SERVER_VERSION } from './ActionCacheServerVersion';
import type { GithubLocalRunnerCleanupResult } from './GithubLocalRunnerCleanupResult';
import type { IGithubLocalRunner } from './IGithubLocalRunner';
import type { IGithubLocalRunnerInput } from './IGithubLocalRunnerInput';
import type { IGithubLocalRunnerSession } from './IGithubLocalRunnerSession';
import type { IGuestToolAssets } from './IGuestToolAssets';
import { actionCacheServerAssets } from './ActionCacheServerAssets';
import { actionsRunnerAssets } from './ActionsRunnerAssets';
import { normalizedRepository } from './normalizedRepository';

// #endregion

/**
 * Registers a workflow-scoped GitHub Actions runner inside the shared managed Lima VM. GitHub
 * remains the scheduler and check reporter; this class only supplies the execution host.
 */
export class ManagedLimaGithubRunner implements IGithubLocalRunner {
  // #region Fields

  private readonly _limaEnvironment: ManagedLimaEnvironment;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IManagedLimaGithubRunnerOptions = {}) {
    this._limaEnvironment = _options.environment ?? new ManagedLimaEnvironment(_options);
  }

  // #endregion

  // #region Methods

  /**
   * Starts.
   *
   * @param input - Input.
   * @param signal - Signal.
   * @public
   */
  public async start(
    input: IGithubLocalRunnerInput,
    signal: AbortSignal,
  ): Promise<IGithubLocalRunnerSession> {
    validateInput(input);
    this._limaEnvironment.assertSupportedHost();
    const architecture = this._limaEnvironment.architecture;
    let session: IManagedLimaSession | undefined;
    let runnerProcess: ReturnType<IManagedLimaSession['spawnGuest']> | undefined;
    let stopPromise: Promise<void> | undefined;

    const stop = (): Promise<void> => {
      stopPromise ??= (async () => {
        terminate(runnerProcess);
        await session?.stop();
      })();
      return stopPromise;
    };

    try {
      const guestAssets = this._options.prepareGuestAssets
        ? await this._options.prepareGuestAssets(input.runtimeRoot, architecture, signal)
        : await this.ensureGuestAssets(input.runtimeRoot, architecture, signal);
      const repositoryCacheRoot = localRepositoryCacheRoot(input.runtimeRoot, input.repositoryUrl);
      const repositoryCacheIdentity = localRepositoryCacheIdentity(
        input.repositoryUrl,
        architecture,
      );
      session = await this._limaEnvironment.start(
        {
          instanceKey: input.reuse ? (input.warmInstanceKey ?? input.runnerName) : input.runnerName,
          instancePrefix: 'sci',
          ...(input.reuse ? { reuse: true } : {}),
          runtimeRoot: input.runtimeRoot,
          resources: input.resources,
          storageLimitGiB: input.storageLimitGiB,
          minimumFreeDiskGiB: input.minimumFreeDiskGiB,
          mounts: [
            {
              location: realpathSync(guestAssets.root),
              mountPoint: '/var/lib/symphony-local-ci/tools',
              writable: false,
            },
            {
              location: realpathSync(repositoryCacheRoot),
              mountPoint: '/var/lib/symphony-local-ci/cache',
              writable: true,
            },
          ],
          image: input.image,
          ...(input.setupScript ? { setupScript: input.setupScript } : {}),
        },
        signal,
      );
      const active = session;

      await active.writeGuestFile(
        '/tmp/symphony-runner-registration-token',
        input.registrationToken,
      );
      await active.writeGuestFile('/tmp/symphony-runner-repository-url', input.repositoryUrl);
      await active.writeGuestFile('/tmp/symphony-runner-name', input.runnerName);
      await active.writeGuestFile('/tmp/symphony-runner-labels', input.labels.join(','));
      await active.shell(
        runnerSetupScript(
          architecture,
          basename(guestAssets.runnerArchive),
          basename(guestAssets.cacheServerArchive),
          input.resources.cacheGiB,
          localCiSwapGiB(input.resources),
          repositoryCacheIdentity,
        ),
        COMMAND_TIMEOUT_MILLISECONDS,
      );

      runnerProcess = active.spawnGuest([
        'sudo',
        'env',
        'RUNNER_ALLOW_RUNASROOT=1',
        `ACTIONS_RESULTS_URL=http://127.0.0.1:${ACTION_CACHE_SERVER_PORT}/`,
        `ACTIONS_CACHE_URL=http://127.0.0.1:${ACTION_CACHE_SERVER_PORT}/`,
        '/opt/actions-runner/run.sh',
      ]);
      const completion = processCompletion(runnerProcess).catch((cause: unknown) => {
        const storageFailure = active.storageFailure();
        if (storageFailure) throw storageFailure;
        throw cause;
      });
      const abort = (): void => void stop();
      if (active.signal.aborted) void stop();
      else active.signal.addEventListener('abort', abort, { once: true });
      const removeAbortListener = (): void => active.signal.removeEventListener('abort', abort);
      void completion.then(removeAbortListener, removeAbortListener);

      return {
        runnerName: input.runnerName,
        os: 'linux',
        architecture,
        imageVersion: localCiImageVersion(input.image),
        completion,
        diagnostics: () => active.diagnostics(),
        stop,
      };
    } catch (cause) {
      const storageFailure = session?.storageFailure();
      await stop();
      if (storageFailure) throw storageFailure;
      throw secretSafeError('Unable to start the managed local CI runner', cause);
    }
  }

  /**
   * Returns the cleanup.
   *
   * @param runtimeRoot - Runtime root.
   * @param signal - Signal.
   * @param preserve - Preserve.
   * @public
   */
  public cleanup(
    runtimeRoot: string,
    signal: AbortSignal,
    preserve: readonly string[] = [],
  ): Promise<GithubLocalRunnerCleanupResult> {
    return this._limaEnvironment.cleanup(runtimeRoot, signal, preserve);
  }

  /**
   * Every managed machine that currently occupies disk under the runtime root.
   *
   * @param runtimeRoot - Runtime root.
   * @param signal - Signal.
   * @public
   */
  public instances(
    runtimeRoot: string,
    signal: AbortSignal,
  ): Promise<readonly IManagedLimaInstanceDescription[]> {
    return this._limaEnvironment.instances(runtimeRoot, signal);
  }

  /**
   * Removes one managed machine that automatic cleanup left behind.
   *
   * @param runtimeRoot - Runtime root.
   * @param instanceName - Instance name.
   * @param signal - Signal.
   * @public
   */
  public removeInstance(
    runtimeRoot: string,
    instanceName: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    return this._limaEnvironment.removeInstance(runtimeRoot, instanceName, signal);
  }

  private async ensureGuestAssets(
    runtimeRoot: string,
    architecture: 'arm64' | 'x64',
    signal: AbortSignal,
  ): Promise<IGuestToolAssets> {
    const root = join(
      runtimeRoot,
      'tools',
      `guest-${architecture}-runner-${ACTIONS_RUNNER_VERSION}-cache-${ACTION_CACHE_SERVER_VERSION}`,
    );
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const runnerAsset = actionsRunnerAssets[architecture];
    const runnerArchive = join(root, runnerAsset.archive);
    await this._limaEnvironment.ensureDownloadedAsset(
      runnerArchive,
      `https://github.com/actions/runner/releases/download/v${ACTIONS_RUNNER_VERSION}/${runnerAsset.archive}`,
      runnerAsset.sha256,
      MAX_RUNNER_ARCHIVE_BYTES,
      signal,
    );
    const cacheServerAsset = actionCacheServerAssets[architecture];
    const cacheServerArchive = join(root, cacheServerAsset.archive);
    await this._limaEnvironment.ensureDownloadedAsset(
      cacheServerArchive,
      `https://github.com/MxOrbit/GitHubActionCacheServer/releases/download/v${ACTION_CACHE_SERVER_VERSION}/${cacheServerAsset.archive}`,
      cacheServerAsset.sha256,
      MAX_CACHE_SERVER_ARCHIVE_BYTES,
      signal,
    );
    return { root, runnerArchive, cacheServerArchive };
  }

  // #endregion
}

const MAX_RUNNER_ARCHIVE_BYTES = 256 * 1024 * 1024;

const MAX_CACHE_SERVER_ARCHIVE_BYTES = 32 * 1024 * 1024;

interface IManagedLimaGithubRunnerOptions extends IManagedLimaEnvironmentOptions {
  readonly environment?: ManagedLimaEnvironment;
  readonly prepareGuestAssets?: (
    runtimeRoot: string,
    architecture: 'arm64' | 'x64',
    signal: AbortSignal,
  ) => Promise<IGuestToolAssets>;
}

function validateInput(input: IGithubLocalRunnerInput): void {
  const repository = new URL(input.repositoryUrl);
  if (repository.protocol !== 'https:' || !repository.hostname || repository.username) {
    throw new Error('Local CI requires a credential-free HTTPS repository URL.');
  }
  if (!/^[a-zA-Z0-9._-]{1,64}$/u.test(input.runnerName)) {
    throw new Error('Local CI runner name is invalid.');
  }
  if (
    input.labels.length < 1 ||
    input.labels.length > 16 ||
    input.labels.some((label) => !/^[a-zA-Z0-9._-]{1,64}$/u.test(label))
  ) {
    throw new Error('Local CI runner labels are invalid.');
  }
  if (input.registrationToken.length < 20 || input.registrationToken.length > 512) {
    throw new Error('Local CI registration token is invalid.');
  }
  if (
    !Number.isInteger(input.resources.cpus) ||
    input.resources.cpus < localCiResourceMinimums.cpus ||
    input.resources.cpus > 16 ||
    !Number.isInteger(input.resources.memoryGiB) ||
    input.resources.memoryGiB < localCiResourceMinimums.memoryGiB ||
    input.resources.memoryGiB > 32 ||
    !Number.isInteger(input.resources.diskGiB) ||
    input.resources.diskGiB < localCiResourceMinimums.diskGiB ||
    input.resources.diskGiB > 120 ||
    !Number.isInteger(input.resources.cacheGiB) ||
    input.resources.cacheGiB < localCiResourceMinimums.cacheGiB ||
    input.resources.cacheGiB > 50 ||
    !Number.isInteger(input.storageLimitGiB) ||
    input.storageLimitGiB < 8 ||
    input.storageLimitGiB > 256 ||
    !Number.isInteger(input.minimumFreeDiskGiB) ||
    input.minimumFreeDiskGiB < 5 ||
    input.minimumFreeDiskGiB > 512
  ) {
    throw new Error('Local CI resource limits are invalid.');
  }
}

function localRepositoryCacheRoot(runtimeRoot: string, repositoryUrl: string): string {
  const namespace = createHash('sha256')
    .update(normalizedRepository(repositoryUrl))
    .digest('hex')
    .slice(0, 32);
  const cacheRoot = join(runtimeRoot, 'cache', 'repositories', namespace);
  mkdirSync(cacheRoot, { recursive: true, mode: 0o700 });
  return cacheRoot;
}

function localRepositoryCacheIdentity(
  repositoryUrl: string,
  architecture: 'arm64' | 'x64',
): string {
  return createHash('sha256')
    .update(`symphony-local-ci:${normalizedRepository(repositoryUrl)}:${architecture}`)
    .digest('hex')
    .slice(0, 32);
}

function runnerSetupScript(
  architecture: 'arm64' | 'x64',
  runnerArchive: string,
  cacheServerArchive: string,
  cacheGiB: number,
  swapGiB: number,
  repositoryCacheIdentity: string,
): string {
  const runnerAsset = actionsRunnerAssets[architecture];
  const cacheServerAsset = actionCacheServerAssets[architecture];
  const maximumCacheBytes = cacheGiB * 1024 * 1024 * 1024;
  return [
    'set -euo pipefail',
    'token="$(cat /tmp/symphony-runner-registration-token)"',
    'repository_url="$(cat /tmp/symphony-runner-repository-url)"',
    'runner_name="$(cat /tmp/symphony-runner-name)"',
    'runner_labels="$(cat /tmp/symphony-runner-labels)"',
    'rm -f /tmp/symphony-runner-registration-token /tmp/symphony-runner-repository-url /tmp/symphony-runner-name /tmp/symphony-runner-labels',
    `echo '${repositoryCacheIdentity}' | sudo tee /etc/machine-id >/dev/null`,
    'sudo rm -f /var/lib/dbus/machine-id',
    'sudo ln -s /etc/machine-id /var/lib/dbus/machine-id',
    ...(swapGiB > 0
      ? [
          'if ! swapon --show | grep -q /swapfile; then',
          `  sudo fallocate -l ${swapGiB}G /swapfile`,
          '  sudo chmod 0600 /swapfile',
          '  sudo mkswap /swapfile >/dev/null',
          '  sudo swapon /swapfile',
          '  sudo sysctl -w vm.swappiness=10 >/dev/null',
          'fi',
        ]
      : []),
    'sudo mkdir -p /opt/symphony-cache-server /var/lib/symphony-local-ci/cache/data',
    `echo '${cacheServerAsset.sha256}  /var/lib/symphony-local-ci/tools/${cacheServerArchive}' | sha256sum --check`,
    `sudo tar -xzf '/var/lib/symphony-local-ci/tools/${cacheServerArchive}' -C /opt/symphony-cache-server`,
    'sudo chmod 0755 /opt/symphony-cache-server/action-cache-server',
    [
      "sudo tee /etc/systemd/system/symphony-cache.service >/dev/null <<'SYMPHONY_CACHE_SERVICE'",
      '[Unit]',
      'Description=Symphony managed local GitHub Actions cache',
      'After=network-online.target',
      'Wants=network-online.target',
      '',
      '[Service]',
      'Type=simple',
      `Environment=ADDR=127.0.0.1:${ACTION_CACHE_SERVER_PORT}`,
      `Environment=API_BASE_URL=http://127.0.0.1:${ACTION_CACHE_SERVER_PORT}`,
      'Environment=DB_SQLITE_PATH=/var/lib/symphony-local-ci/cache/data/cache.sqlite',
      'Environment=STORAGE_FILESYSTEM_PATH=/var/lib/symphony-local-ci/cache/data/objects',
      `Environment=CACHE_MAX_SIZE_BYTES=${maximumCacheBytes}`,
      'Environment=CACHE_CLEANUP_OLDER_THAN_DAYS=30',
      'ExecStart=/opt/symphony-cache-server/action-cache-server',
      'Restart=on-failure',
      'RestartSec=2',
      'NoNewPrivileges=true',
      'ProtectSystem=strict',
      'ReadWritePaths=/var/lib/symphony-local-ci/cache',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'SYMPHONY_CACHE_SERVICE',
    ].join('\n'),
    'sudo systemctl daemon-reload',
    'sudo systemctl enable --now symphony-cache.service',
    `for attempt in $(seq 1 30); do curl --fail --silent http://127.0.0.1:${ACTION_CACHE_SERVER_PORT}/health >/dev/null && break; sleep 1; done`,
    `curl --fail --silent http://127.0.0.1:${ACTION_CACHE_SERVER_PORT}/health >/dev/null || { sudo journalctl -u symphony-cache.service --no-pager -n 50; exit 1; }`,
    'sudo mkdir -p /opt/actions-runner',
    `echo '${runnerAsset.sha256}  /var/lib/symphony-local-ci/tools/${runnerArchive}' | sha256sum --check`,
    `sudo tar -xzf '/var/lib/symphony-local-ci/tools/${runnerArchive}' -C /opt/actions-runner`,
    [
      "sudo python3 - <<'SYMPHONY_RUNNER_PATCH'",
      'from pathlib import Path',
      "path = Path('/opt/actions-runner/bin/Runner.Worker.dll')",
      'data = path.read_bytes()',
      'replacements = {',
      "    'ACTIONS_RESULTS_URL': 'LOCALCI_RESULTS_URL',",
      "    'ACTIONS_CACHE_URL': 'LOCALCI_CACHE_URL',",
      '}',
      'for source, target in replacements.items():',
      "    source_bytes = source.encode('utf-16le')",
      "    target_bytes = target.encode('utf-16le')",
      '    if len(source_bytes) != len(target_bytes) or data.count(source_bytes) != 1:',
      "        raise SystemExit(f'Unsupported GitHub Actions runner cache endpoint layout: {source}')",
      '    data = data.replace(source_bytes, target_bytes)',
      'path.write_bytes(data)',
      'SYMPHONY_RUNNER_PATCH',
    ].join('\n'),
    'cd /opt/actions-runner',
    'sudo env RUNNER_ALLOW_RUNASROOT=1 ./config.sh --unattended --disableupdate --replace --url "$repository_url" --token "$token" --name "$runner_name" --labels "$runner_labels" --work _work',
    'unset token',
  ].join('\n');
}

function localCiImageVersion(image: IRunnerImageDefinition): string {
  return `${managedLimaImageVersion(image)}/actions-runner-${ACTIONS_RUNNER_VERSION}-local-cache/action-cache-server-${ACTION_CACHE_SERVER_VERSION}`;
}
