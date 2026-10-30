// #region Imports

import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IRepositoryBinding } from '@symphony/domain-workspace';

// #endregion

type PortableRepositoryBinding = Omit<IRepositoryBinding, 'localPath'>;

interface IPortableSettingsFile extends Omit<
  IApplicationSettings,
  'localCi' | 'runtime' | 'repositoryBindings'
> {
  readonly version: 6;
  readonly runtime: Omit<IApplicationSettings['runtime'], 'workspaceRoot'>;
  readonly repositoryBindings: readonly PortableRepositoryBinding[];
}

interface IMachineSettingsFile {
  readonly version: 6;
  readonly workspaceRoot: string;
  readonly localCi?: IApplicationSettings['localCi'];
  readonly repositoryPaths: Readonly<Record<string, string>>;
}

/**
 * Persists portable and machine-local settings through their existing atomic file owners.
 *
 * @public
 */
export class JsonSettingsRepository {
  // #region Ctor

  /**
   * Binds the existing file paths and validation dependencies.
   *
   * @public
   */
  public constructor(
    private readonly _settingsPath: string,
    private readonly _machineSettingsPath: string,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public initialize(): void {
    for (const directory of new Set([
      dirname(this._settingsPath),
      dirname(this._machineSettingsPath),
    ])) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Whether it has stored settings.
   *
   * @public
   */
  public hasStoredSettings(): boolean {
    return existsSync(this._settingsPath);
  }

  /**
   * Loads.
   *
   * @param fallback - Fallback.
   * @public
   */
  public load(fallback: IApplicationSettings): unknown {
    if (!existsSync(this._settingsPath)) return fallback;

    const portable = this.readJson<IPortableSettingsFile>(this._settingsPath);
    const machine = existsSync(this._machineSettingsPath)
      ? this.readJson<IMachineSettingsFile>(this._machineSettingsPath)
      : undefined;
    return {
      ...portable,
      localCi: machine?.localCi ?? fallback.localCi,
      runtime: {
        ...portable.runtime,
        workspaceRoot: machine?.workspaceRoot ?? fallback.runtime.workspaceRoot,
      },
      repositoryBindings: portable.repositoryBindings.map((repository) => ({
        ...repository,
        localPath: machine?.repositoryPaths[repository.id] ?? this.repositoryPath(repository.id),
      })),
    } satisfies IApplicationSettings;
  }

  /**
   * Saves.
   *
   * @param settings - Settings.
   * @public
   */
  public save(settings: IApplicationSettings): IApplicationSettings {
    const { workspaceRoot, ...portableRuntime } = settings.runtime;
    const portableRepositories = settings.repositoryBindings.map((repository) => ({
      id: repository.id,
      workspaceId: repository.workspaceId,
      sourceControlConnectionId: repository.sourceControlConnectionId,
      displayName: repository.displayName,
      provider: repository.provider,
      host: repository.host,
      owner: repository.owner,
      name: repository.name,
      defaultBranch: repository.defaultBranch,
      enabled: repository.enabled,
      localCiSetupScript: repository.localCiSetupScript,
    }));
    const portable: IPortableSettingsFile = {
      ...omitLocalCi(settings),
      version: 6,
      runtime: portableRuntime,
      repositoryBindings: portableRepositories,
    };
    const machine: IMachineSettingsFile = {
      version: 6,
      workspaceRoot,
      localCi: settings.localCi,
      repositoryPaths: Object.fromEntries(
        settings.repositoryBindings.map((repository) => [repository.id, repository.localPath]),
      ),
    };

    this.writeJsonAtomically(this._machineSettingsPath, machine);
    this.writeJsonAtomically(this._settingsPath, portable);
    return settings;
  }

  /**
   * Returns the repository path.
   *
   * @param repositoryId - Repository id.
   * @public
   */
  public repositoryPath(repositoryId: string): string {
    const stableId = createHash('sha256').update(repositoryId).digest('hex').slice(0, 16);
    return join(dirname(this._settingsPath), 'repositories', stableId);
  }

  private readJson<T>(path: string): T {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as T;
    } catch (cause) {
      throw new Error(
        `Unable to read Symphony settings from ${path}: ${cause instanceof Error ? cause.message : 'invalid JSON'}`,
        { cause },
      );
    }
  }

  private writeJsonAtomically(path: string, value: unknown): void {
    const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temporaryPath, path);
    chmodSync(path, 0o600);
  }

  // #endregion
}

function omitLocalCi(settings: IApplicationSettings): Omit<IApplicationSettings, 'localCi'> {
  const { localCi, ...portable } = settings;
  void localCi;
  return portable;
}
