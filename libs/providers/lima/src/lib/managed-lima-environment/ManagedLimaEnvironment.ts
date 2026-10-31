// #region Imports

import { arch, platform } from 'node:os';
import { assertSetupScript } from '@symphony/domain-ci';
import { IRunnerImageDefinition } from '@symphony/domain-core';
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { type ChildProcess, spawn } from 'node:child_process';
import { COMMAND_TIMEOUT_MILLISECONDS } from './CommandTimeoutMilliseconds';
import { GUEST_FINGERPRINT_FILE } from './GuestFingerprintFile';
import { GUEST_NODE_MOUNT } from './GuestNodeMount';
import { GUEST_SETUP_SCRIPT } from './GuestSetupScript';
import type { IManagedLimaCleanupResult } from './IManagedLimaCleanupResult';
import type { IManagedLimaEnvironmentOptions } from './IManagedLimaEnvironmentOptions';
import type { IManagedLimaInstanceDescription } from './IManagedLimaInstanceDescription';
import type { IManagedLimaSession } from './IManagedLimaSession';
import type { IManagedLimaStartInput } from './IManagedLimaStartInput';
import { LIMA_VERSION } from './LimaVersion';
import { MAX_PROCESS_OUTPUT_BYTES } from './MaxProcessOutputBytes';
import { MAX_TOOL_ARCHIVE_BYTES } from './MaxToolArchiveBytes';
import type { ManagedLimaInstancePurpose } from './ManagedLimaInstancePurpose';
import { NODE_ARCHIVE_MAX_BYTES } from './NodeArchiveMaxBytes';
import { SETUP_SCRIPT_TIMEOUT_MILLISECONDS } from './SetupScriptTimeoutMilliseconds';
import { VM_START_TIMEOUT_MILLISECONDS } from './VmStartTimeoutMilliseconds';
import { assertRuntimeStorage } from './assertRuntimeStorage';
import { guestFingerprint } from './guestFingerprint';
import { guestProvisioningScript } from './guestProvisioningScript';
import { guestResetScript } from './guestResetScript';
import { isManagedInstanceName } from './isManagedInstanceName';
import { limaAssets } from './LimaAssets';
import { limaConfiguration } from './limaConfiguration';
import { limaExecutablePath } from './limaExecutablePath';
import { limaInstanceName } from './limaInstanceName';
import { managedLimaDiagnostics } from './managedLimaDiagnostics';
import { managedLimaImageVersion } from './managedLimaImageVersion';
import { normalizedArchitecture } from './normalizedArchitecture';
import { processCompletion } from './processCompletion';
import { removeShortLimaHome } from './removeShortLimaHome';
import { runtimeEnvironment } from './runtimeEnvironment';
import { shortLimaHome } from './shortLimaHome';
import { verifySha256 } from './verifySha256';
import { execFileAsync } from '@symphony/providers-core';

// #endregion

/**
 * Owns the pinned Apple Virtualization runtime used by the managed GitHub runner: Lima
 * installation, VM creation, guest provisioning from a selected runner image definition, guest
 * transport, storage safety stops, diagnostics, and instance cleanup.
 *
 * The guest *contents* are configuration, never Symphony source. Packages, Node.js version, and
 * environment come from the selected runner image definition; anything a repository needs beyond
 * that comes from that repository's own setup script.
 */
export class ManagedLimaEnvironment {
  // #region Fields

  private readonly _fetchImplementation: typeof fetch;
  private readonly _hostPlatform: NodeJS.Platform;
  private readonly _hostArchitecture: string;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IManagedLimaEnvironmentOptions = {}) {
    this._fetchImplementation = _options.fetch ?? fetch;
    this._hostPlatform = _options.platform ?? platform();
    this._hostArchitecture = _options.architecture ?? arch();
  }

  // #endregion

  // #region Properties

  /**
   * The architecture.
   *
   * @public
   * @readonly
   */
  public get architecture(): 'arm64' | 'x64' {
    return normalizedArchitecture(this._hostArchitecture);
  }

  // #endregion

  // #region Methods

  /**
   * Returns the assert supported host.
   *
   * @public
   */
  public assertSupportedHost(): void {
    if (this._hostPlatform !== 'darwin') {
      throw new Error('Managed local CI currently requires macOS with Apple Virtualization.');
    }
  }

  /**
   * Whether it is supported host.
   *
   * @public
   */
  public isSupportedHost(): boolean {
    return this._hostPlatform === 'darwin';
  }

  /**
   * Starts.
   *
   * @param input - Input.
   * @param signal - Signal.
   * @public
   */
  public async start(
    input: IManagedLimaStartInput,
    signal: AbortSignal,
  ): Promise<IManagedLimaSession> {
    this.assertSupportedHost();
    const architecture = this.architecture;
    if (input.image.architecture !== architecture) {
      throw new Error(
        `The selected runner image targets ${input.image.architecture} but this Mac is ${architecture}.`,
      );
    }
    if (input.setupScript) assertSetupScript(input.setupScript);
    const runtimeRoot = input.runtimeRoot;
    mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
    assertRuntimeStorage(input);
    const limaHome = shortLimaHome(runtimeRoot);
    const storageController = new AbortController();
    const operationSignal = AbortSignal.any([signal, storageController.signal]);
    let storageFailure: Error | undefined;
    const storageTimer = setInterval(() => {
      try {
        assertRuntimeStorage(input);
      } catch (cause) {
        storageFailure =
          cause instanceof Error ? cause : new Error('Local CI storage safety stop activated.');
        storageController.abort(storageFailure);
      }
    }, 1_000);
    storageTimer.unref();
    const instanceName = limaInstanceName(input.instancePrefix, input.instanceKey);
    const vmConfigurationPath = join(runtimeRoot, `${instanceName}.yaml`);
    let lima: string | undefined;
    let environment: NodeJS.ProcessEnv | undefined;
    let stopPromise: Promise<void> | undefined;

    const stop = (): Promise<void> => {
      stopPromise ??= (async () => {
        if (lima && environment) {
          if (input.reuse) {
            // A warm instance keeps its provisioned baseline but never its run state.
            await this.bestEffort(
              lima,
              ['shell', '--tty=false', instanceName, 'sudo', 'bash', '-lc', guestResetScript()],
              environment,
            );
            await this.bestEffort(lima, ['stop', instanceName], environment);
          } else {
            await this.bestEffort(lima, ['stop', '--force', instanceName], environment);
            await this.bestEffort(lima, ['delete', '--force', instanceName], environment);
            rmSync(vmConfigurationPath, { force: true });
          }
        } else if (!input.reuse) {
          rmSync(vmConfigurationPath, { force: true });
        }
        removeShortLimaHome(runtimeRoot, limaHome);
        clearInterval(storageTimer);
      })();
      return stopPromise;
    };

    try {
      lima = await this.ensureLima(runtimeRoot, limaHome, architecture, operationSignal);
      environment = runtimeEnvironment(runtimeRoot, limaHome, dirname(lima));
      const nodeRoot = await this.stageNodeRuntime(runtimeRoot, input.image, operationSignal);
      const fingerprint = guestFingerprint(input.image, input.setupScript);
      const reused = input.reuse
        ? await this.resumeWarmInstance(
            lima,
            instanceName,
            fingerprint,
            environment,
            operationSignal,
          )
        : false;
      if (!reused) {
        writeFileSync(
          vmConfigurationPath,
          limaConfiguration(input.image, input.resources, [
            ...input.mounts,
            { location: nodeRoot, mountPoint: GUEST_NODE_MOUNT, writable: false },
          ]),
          { mode: 0o600 },
        );
        await this.execute(
          lima,
          ['start', '--yes', `--name=${instanceName}`, '--timeout=15m', vmConfigurationPath],
          environment,
          operationSignal,
          VM_START_TIMEOUT_MILLISECONDS,
        );
        await this.execute(
          lima,
          [
            'shell',
            '--tty=false',
            instanceName,
            'sudo',
            'env',
            'DEBIAN_FRONTEND=noninteractive',
            'bash',
            '-lc',
            `${guestProvisioningScript(input.image)}\nprintf '%s' ${JSON.stringify(fingerprint)} > ${GUEST_FINGERPRINT_FILE}`,
          ],
          environment,
          operationSignal,
          COMMAND_TIMEOUT_MILLISECONDS,
        );
      }
      const sessionLima = lima;
      const sessionEnvironment = environment;

      const session: IManagedLimaSession = {
        instanceName,
        architecture,
        imageVersion: managedLimaImageVersion(input.image),
        reused,
        signal: operationSignal,
        storageFailure: () => storageFailure,
        limactl: (arguments_, timeoutMilliseconds = COMMAND_TIMEOUT_MILLISECONDS) =>
          this.execute(
            sessionLima,
            arguments_,
            sessionEnvironment,
            operationSignal,
            timeoutMilliseconds,
          ),
        shell: (script, timeoutMilliseconds = COMMAND_TIMEOUT_MILLISECONDS) =>
          this.execute(
            sessionLima,
            ['shell', '--tty=false', instanceName, 'bash', '-lc', script],
            sessionEnvironment,
            operationSignal,
            timeoutMilliseconds,
          ),
        spawnGuest: (arguments_) =>
          this.spawn(
            sessionLima,
            ['shell', '--tty=false', instanceName, ...arguments_],
            sessionEnvironment,
          ),
        writeGuestFile: async (guestPath, value) => {
          const child = this.spawn(
            sessionLima,
            ['shell', '--tty=false', instanceName, 'sh', '-c', `umask 077; cat > ${guestPath}`],
            sessionEnvironment,
          );
          if (!child.stdin) throw new Error('Managed guest file input is unavailable.');
          const inputCompletion = new Promise<void>((resolve, reject) => {
            child.stdin?.once('error', reject);
            child.stdin?.end(value, resolve);
          });
          await Promise.all([processCompletion(child, operationSignal), inputCompletion]);
        },
        copyToGuest: (hostPath, guestPath, timeoutMilliseconds = COMMAND_TIMEOUT_MILLISECONDS) =>
          this.execute(
            sessionLima,
            ['copy', hostPath, `${instanceName}:${guestPath}`],
            sessionEnvironment,
            operationSignal,
            timeoutMilliseconds,
          ).then(() => undefined),
        copyFromGuest: (guestPath, hostPath, timeoutMilliseconds = COMMAND_TIMEOUT_MILLISECONDS) =>
          this.execute(
            sessionLima,
            ['copy', '--recursive', `${instanceName}:${guestPath}`, hostPath],
            sessionEnvironment,
            operationSignal,
            timeoutMilliseconds,
          ).then(() => undefined),
        diagnostics: async () =>
          this.execute(
            sessionLima,
            ['shell', '--tty=false', instanceName, 'sudo', 'sh', '-lc', managedLimaDiagnostics()],
            sessionEnvironment,
            new AbortController().signal,
            10_000,
          ),
        stop,
      };

      if (input.setupScript?.trim() && !reused) {
        await session.writeGuestFile(GUEST_SETUP_SCRIPT, input.setupScript);
        await session.shell(
          [
            'set -euo pipefail',
            `chmod 0700 ${GUEST_SETUP_SCRIPT}`,
            'cd "$HOME"',
            `bash ${GUEST_SETUP_SCRIPT}`,
          ].join('\n'),
          SETUP_SCRIPT_TIMEOUT_MILLISECONDS,
        );
      }

      return session;
    } catch (cause) {
      await stop();
      if (storageFailure) throw storageFailure;
      throw cause;
    }
  }

  /**
   * Removes Symphony-owned instances. A warm instance named in `preserve` is left in place, so
   * reconciliation of abandoned instances never destroys the reusable one.
   *
   * @param runtimeRoot - Runtime root.
   * @param signal - Signal.
   * @param preserve - Preserve.
   * @public
   */
  public async cleanup(
    runtimeRoot: string,
    signal: AbortSignal,
    preserve: readonly string[] = [],
  ): Promise<IManagedLimaCleanupResult> {
    if (!this.isSupportedHost() || !existsSync(runtimeRoot)) {
      return { removedInstances: 0, failedInstances: 0, removedConfigurationFiles: 0 };
    }
    const architecture = this.architecture;
    const lima = limaExecutablePath(runtimeRoot, architecture);
    try {
      accessSync(lima, constants.X_OK);
    } catch {
      return { removedInstances: 0, failedInstances: 0, removedConfigurationFiles: 0 };
    }
    const limaHome = shortLimaHome(runtimeRoot);
    const physicalLimaHome = join(runtimeRoot, 'lima');
    const environment = runtimeEnvironment(runtimeRoot, limaHome, dirname(lima));
    const instanceNames = existsSync(physicalLimaHome)
      ? readdirSync(physicalLimaHome, { withFileTypes: true })
          .filter(
            (entry) =>
              entry.isDirectory() &&
              isManagedInstanceName(entry.name) &&
              !preserve.includes(entry.name),
          )
          .map((entry) => entry.name)
      : [];
    let removedInstances = 0;
    let failedInstances = 0;
    for (const instanceName of instanceNames) {
      if (signal.aborted) throw signal.reason;
      await this.bestEffort(lima, ['stop', '--force', instanceName], environment);
      try {
        await this.execute(
          lima,
          ['delete', '--force', instanceName],
          environment,
          signal,
          COMMAND_TIMEOUT_MILLISECONDS,
        );
        if (existsSync(join(physicalLimaHome, instanceName))) failedInstances += 1;
        else removedInstances += 1;
      } catch {
        failedInstances += 1;
      }
    }
    let removedConfigurationFiles = 0;
    for (const entry of readdirSync(runtimeRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
      const instanceName = entry.name.slice(0, -'.yaml'.length);
      if (!isManagedInstanceName(instanceName)) continue;
      if (preserve.includes(instanceName)) continue;
      if (existsSync(join(physicalLimaHome, instanceName))) continue;
      rmSync(join(runtimeRoot, entry.name), { force: true });
      removedConfigurationFiles += 1;
    }
    removeShortLimaHome(runtimeRoot, limaHome);
    return { removedInstances, failedInstances, removedConfigurationFiles };
  }

  /**
   * Resumes a warm instance when its recorded guest fingerprint still matches the requested
   * definition, and proves the reset before the instance is handed back. Any mismatch, missing
   * fingerprint, or failed reset destroys the instance so the caller provisions a fresh one.
   */
  /**
   * Every managed instance that currently occupies disk. The directory is the source of truth,
   * not `limactl list`: a failed teardown leaves the disk behind while Lima has already
   * forgotten the instance, and that is exactly the case an operator needs to see.
   *
   * @param runtimeRoot - Runtime root.
   * @param signal - Signal.
   * @public
   */
  public async instances(
    runtimeRoot: string,
    signal: AbortSignal,
  ): Promise<readonly IManagedLimaInstanceDescription[]> {
    const physicalLimaHome = join(runtimeRoot, 'lima');
    if (!existsSync(physicalLimaHome)) return [];
    const names = readdirSync(physicalLimaHome, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isManagedInstanceName(entry.name))
      .map((entry) => entry.name)
      .sort();
    if (!names.length) return [];
    const statuses = await this.instanceStatuses(runtimeRoot, signal);
    return names.map((name) => {
      const directory = join(physicalLimaHome, name);
      const createdAt = birthTime(directory);
      const provisionedDiskGiB = provisionedDiskGiBOf(join(directory, 'lima.yaml'));
      return {
        name,
        purpose: instancePurpose(name),
        status: statuses.get(name) ?? 'missing',
        ...(createdAt ? { createdAt } : {}),
        ...(provisionedDiskGiB ? { provisionedDiskGiB } : {}),
      };
    });
  }

  /**
   * Removes one managed instance and its configuration. Used by the manual escape hatch in the
   * settings, so it accepts only names Symphony itself can have created.
   *
   * @param runtimeRoot - Runtime root.
   * @param instanceName - Instance name.
   * @param signal - Signal.
   * @public
   */
  public async removeInstance(
    runtimeRoot: string,
    instanceName: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    if (!isManagedInstanceName(instanceName)) {
      throw new Error('Only a managed Local GitHub Actions machine can be removed.');
    }
    const physicalLimaHome = join(runtimeRoot, 'lima');
    const configurationPath = join(runtimeRoot, `${instanceName}.yaml`);
    const lima = limaExecutablePath(runtimeRoot, this.architecture);
    if (this.isSupportedHost() && isExecutable(lima)) {
      const limaHome = shortLimaHome(runtimeRoot);
      const environment = runtimeEnvironment(runtimeRoot, limaHome, dirname(lima));
      await this.bestEffort(lima, ['stop', '--force', instanceName], environment);
      try {
        await this.execute(
          lima,
          ['delete', '--force', instanceName],
          environment,
          signal,
          COMMAND_TIMEOUT_MILLISECONDS,
        );
      } finally {
        removeShortLimaHome(runtimeRoot, limaHome);
      }
    }
    // A directory Lima refuses to forget still holds the disk, so the caller must learn about it.
    if (existsSync(join(physicalLimaHome, instanceName))) return false;
    rmSync(configurationPath, { force: true });
    return true;
  }

  /**
   * Downloads and verifies the Node.js runtime the selected image declares.
   *
   * @param runtimeRoot - Runtime root.
   * @param image - Image.
   * @param signal - Signal.
   * @public
   */
  public async stageNodeRuntime(
    runtimeRoot: string,
    image: IRunnerImageDefinition,
    signal: AbortSignal,
  ): Promise<string> {
    const root = join(runtimeRoot, 'tools', `node-${image.nodeVersion}-${image.architecture}`);
    mkdirSync(root, { recursive: true, mode: 0o700 });
    await this.ensureDownloadedAsset(
      join(root, image.nodeArchive),
      `https://nodejs.org/dist/v${image.nodeVersion}/${image.nodeArchive}`,
      image.nodeSha256,
      NODE_ARCHIVE_MAX_BYTES,
      signal,
    );
    return realpathSync(root);
  }

  /**
   * Ensures the downloaded asset.
   *
   * @param destination - Destination.
   * @param url - Url.
   * @param sha256 - Sha256.
   * @param maximumBytes - Maximum bytes.
   * @param signal - Signal.
   * @public
   */
  public async ensureDownloadedAsset(
    destination: string,
    url: string,
    sha256: string,
    maximumBytes: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (existsSync(destination)) return;
    const response = await this._fetchImplementation(url, { signal, redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`Local CI tool download failed with HTTP ${response.status}.`);
    }
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > maximumBytes) throw new Error('Local CI tool download is too large.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maximumBytes) throw new Error('Local CI tool download is too large.');
    verifySha256(bytes, sha256, 'Downloaded local CI tool failed checksum verification.');
    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    const temporaryPath = `${destination}.downloading`;
    writeFileSync(temporaryPath, bytes, { mode: 0o600 });
    renameSync(temporaryPath, destination);
  }

  /**
   * Executes.
   *
   * @param executable - Executable.
   * @param arguments_ - Arguments.
   * @param environment - Environment.
   * @param signal - Signal.
   * @param timeoutMilliseconds - Timeout milliseconds.
   * @public
   */
  public execute(
    executable: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv,
    signal: AbortSignal,
    timeoutMilliseconds: number,
  ): Promise<string> {
    if (this._options.execute) {
      return this._options.execute(
        executable,
        arguments_,
        environment,
        signal,
        timeoutMilliseconds,
      );
    }
    return execFileAsync(executable, [...arguments_], {
      encoding: 'utf8',
      env: environment,
      signal,
      timeout: timeoutMilliseconds,
      maxBuffer: MAX_PROCESS_OUTPUT_BYTES,
      windowsHide: true,
    }).then(({ stdout }) => stdout.trim());
  }

  /**
   * Returns the spawn.
   *
   * @param executable - Executable.
   * @param arguments_ - Arguments.
   * @param environment - Environment.
   * @public
   */
  public spawn(
    executable: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv,
  ): ChildProcess {
    if (this._options.spawn) return this._options.spawn(executable, arguments_, environment);
    return spawn(executable, [...arguments_], {
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      detached: true,
      windowsHide: true,
    });
  }

  /** Lima status per instance name, empty when the manager itself is not installed yet. */
  private async instanceStatuses(
    runtimeRoot: string,
    signal: AbortSignal,
  ): Promise<ReadonlyMap<string, IManagedLimaInstanceDescription['status']>> {
    const statuses = new Map<string, IManagedLimaInstanceDescription['status']>();
    const lima = limaExecutablePath(runtimeRoot, this.architecture);
    if (!this.isSupportedHost() || !isExecutable(lima)) return statuses;
    const limaHome = shortLimaHome(runtimeRoot);
    const environment = runtimeEnvironment(runtimeRoot, limaHome, dirname(lima));
    try {
      const output = await this.execute(
        lima,
        ['list', '--json'],
        environment,
        signal,
        60_000,
      ).catch(() => '');
      for (const line of output.split('\n')) {
        if (!line.trim()) continue;
        try {
          const instance = JSON.parse(line) as { name?: string; status?: string };
          if (!instance.name) continue;
          statuses.set(instance.name, instance.status === 'Running' ? 'running' : 'stopped');
        } catch {
          // Lima prints one JSON object per line; a malformed line is not an instance.
        }
      }
    } finally {
      removeShortLimaHome(runtimeRoot, limaHome);
    }
    return statuses;
  }

  private async resumeWarmInstance(
    lima: string,
    instanceName: string,
    fingerprint: string,
    environment: NodeJS.ProcessEnv,
    signal: AbortSignal,
  ): Promise<boolean> {
    const status = await this.instanceStatus(lima, instanceName, environment, signal);
    if (!status) return false;
    try {
      if (status !== 'Running') {
        await this.execute(
          lima,
          ['start', instanceName],
          environment,
          signal,
          VM_START_TIMEOUT_MILLISECONDS,
        );
      }
      const recorded = (
        await this.execute(
          lima,
          ['shell', '--tty=false', instanceName, 'cat', GUEST_FINGERPRINT_FILE],
          environment,
          signal,
          60_000,
        )
      ).trim();
      if (recorded !== fingerprint) throw new Error('The warm guest definition changed.');
      await this.execute(
        lima,
        ['shell', '--tty=false', instanceName, 'sudo', 'bash', '-lc', guestResetScript()],
        environment,
        signal,
        COMMAND_TIMEOUT_MILLISECONDS,
      );
      return true;
    } catch {
      await this.bestEffort(lima, ['stop', '--force', instanceName], environment);
      await this.bestEffort(lima, ['delete', '--force', instanceName], environment);
      return false;
    }
  }

  /** Lima status of one instance, or `undefined` when it does not exist. */
  private async instanceStatus(
    lima: string,
    instanceName: string,
    environment: NodeJS.ProcessEnv,
    signal: AbortSignal,
  ): Promise<string | undefined> {
    const output = await this.execute(lima, ['list', '--json'], environment, signal, 60_000).catch(
      () => '',
    );
    for (const line of output.split('\n')) {
      if (!line.trim()) continue;
      try {
        const instance = JSON.parse(line) as { name?: string; status?: string };
        if (instance.name === instanceName) return instance.status ?? 'Unknown';
      } catch {
        // Lima prints one JSON object per line; a malformed line is not an instance.
      }
    }
    return undefined;
  }

  private async ensureLima(
    runtimeRoot: string,
    limaHome: string,
    architecture: 'arm64' | 'x64',
    signal: AbortSignal,
  ): Promise<string> {
    const installationRoot = join(runtimeRoot, 'tools', `lima-${LIMA_VERSION}-${architecture}`);
    const executable = join(installationRoot, 'bin', 'limactl');
    try {
      accessSync(executable, constants.X_OK);
      return executable;
    } catch {
      // Continue with the pinned, checksum-verified installation.
    }
    const asset = limaAssets[architecture];
    const url = `https://github.com/lima-vm/lima/releases/download/v${LIMA_VERSION}/${asset.archive}`;
    const response = await this._fetchImplementation(url, { signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`Lima download failed with HTTP ${response.status}.`);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_TOOL_ARCHIVE_BYTES) throw new Error('Lima download is too large.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_TOOL_ARCHIVE_BYTES) throw new Error('Lima download is too large.');
    verifySha256(bytes, asset.sha256);

    const temporaryRoot = `${installationRoot}.installing`;
    rmSync(temporaryRoot, { recursive: true, force: true });
    mkdirSync(temporaryRoot, { recursive: true, mode: 0o700 });
    const archivePath = join(temporaryRoot, asset.archive);
    writeFileSync(archivePath, bytes, { mode: 0o600 });
    await this.execute(
      '/usr/bin/tar',
      ['-xzf', archivePath, '-C', temporaryRoot],
      runtimeEnvironment(runtimeRoot, limaHome, dirname(executable)),
      signal,
      COMMAND_TIMEOUT_MILLISECONDS,
    );
    rmSync(archivePath, { force: true });
    accessSync(join(temporaryRoot, 'bin', 'limactl'), constants.X_OK);
    rmSync(installationRoot, { recursive: true, force: true });
    renameSync(temporaryRoot, installationRoot);
    return executable;
  }

  private async bestEffort(
    executable: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv,
  ): Promise<void> {
    try {
      await this.execute(
        executable,
        arguments_,
        environment,
        new AbortController().signal,
        COMMAND_TIMEOUT_MILLISECONDS,
      );
    } catch {
      // Cleanup remains best effort after an earlier terminal result.
    }
  }

  // #endregion
}

/** Whether a path exists and is executable, used before shelling out to a staged tool. */
function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The managed mode a name belongs to. Legacy names predate the per-mode prefixes. */
function instancePurpose(name: string): ManagedLimaInstancePurpose {
  if (name.startsWith('sci-')) return 'workflow-runner';
  return 'legacy';
}

function birthTime(path: string): string | undefined {
  try {
    return statSync(path).birthtime.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * The provisioned disk size of one instance, read from the configuration Lima copied into it.
 * Reported alongside the measured allocation so an operator can see how much a warm machine can
 * still grow before it fills the budget on its own.
 */
function provisionedDiskGiBOf(configurationPath: string): number | undefined {
  try {
    const match = /^disk:\s*(\d+)GiB\s*$/mu.exec(readFileSync(configurationPath, 'utf8'));
    return match ? Number.parseInt(match[1] as string, 10) : undefined;
  } catch {
    return undefined;
  }
}
