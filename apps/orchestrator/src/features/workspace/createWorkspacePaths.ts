// #region Imports
import {
  type IApplicationSettings,
  applicationSettingsSchema,
} from '@symphony/configuration-composition';
import { workspaceStorageDirectoryName } from '@symphony/persistence-core';
import { resolve, join, relative, dirname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, chmodSync } from 'node:fs';
import { type ICreateWorkspacePathsDependencies } from './ICreateWorkspacePathsDependencies';
// #endregion

/**
 * Owns workspacePaths commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createWorkspacePaths(dependencies: ICreateWorkspacePathsDependencies) {
  const { settingsState, configurationRoot } = dependencies;
  function workspaceIdForRepository(repositoryBindingId: string): string {
    const workspaceId = settingsState.current.repositoryBindings.find(
      (repository) => repository.id === repositoryBindingId,
    )?.workspaceId;
    if (!workspaceId) throw new Error(`Unknown repository binding: ${repositoryBindingId}`);
    return workspaceId;
  }

  function workspaceStoragePaths(
    sourceSettings: IApplicationSettings,
    workspaceId: string,
  ): readonly string[] {
    const directoryName = workspaceStorageDirectoryName(workspaceId);
    return [
      resolve(configurationRoot, 'workspaces', directoryName),
      resolve(sourceSettings.runtime.workspaceRoot, directoryName),
    ].filter((path, index, paths) => paths.indexOf(path) === index);
  }

  function normalizeMachinePaths(input: IApplicationSettings): IApplicationSettings {
    const expandHome = (path: string): string =>
      path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
    return applicationSettingsSchema.parse({
      ...input,
      runtime: { ...input.runtime, workspaceRoot: expandHome(input.runtime.workspaceRoot) },
      repositoryBindings: input.repositoryBindings.map((repository) => ({
        ...repository,
        localPath: expandHome(repository.localPath),
      })),
    });
  }

  function ensureWorkspaceRoot(path: string): void {
    const root = resolve(path);
    const home = resolve(homedir());
    const relativeHome = relative(root, home);
    const broadSystemRoots = new Set(
      [
        '/',
        '/Applications',
        '/Library',
        '/System',
        '/Users',
        '/Volumes',
        '/private',
        '/private/tmp',
        '/private/var',
        '/tmp',
        '/var',
      ].map((candidate) => resolve(candidate)),
    );
    if (
      broadSystemRoots.has(root) ||
      root === dirname(root) ||
      relativeHome === '' ||
      (!relativeHome.startsWith('..') && !isAbsolute(relativeHome))
    ) {
      throw new Error('Choose a dedicated managed workspace folder, not a system or home folder.');
    }
    mkdirSync(path, { recursive: true, mode: 0o700 });
    if (resolve(path) === resolve(configurationRoot, 'workspaces')) chmodSync(path, 0o700);
  }

  function isolatedWorkspaceRoot(workspaceId?: string): string {
    const root = settingsState.current.runtime.workspaceRoot;
    return workspaceId
      ? join(root, workspaceStorageDirectoryName(workspaceId), 'executions')
      : root;
  }

  return Object.freeze({
    workspaceIdForRepository,
    workspaceStoragePaths,
    normalizeMachinePaths,
    ensureWorkspaceRoot,
    isolatedWorkspaceRoot,
  });
}
