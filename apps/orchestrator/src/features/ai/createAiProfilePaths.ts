// #region Imports
import { join } from 'node:path';
import { workspaceStorageDirectoryName } from '@symphony/persistence-core';
import { createHash } from 'node:crypto';
import { type IApplicationSettings } from '@symphony/configuration-composition';
import { homedir } from 'node:os';
import { mkdirSync, chmodSync, existsSync, copyFileSync } from 'node:fs';
import { type ICreateAiProfilePathsDependencies } from './ICreateAiProfilePathsDependencies';
// #endregion

/**
 * Owns aiProfiles commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createAiProfilePaths(dependencies: ICreateAiProfilePathsDependencies) {
  const { configurationRoot } = dependencies;
  function isolatedRuntimeHome(
    workspaceId: string,
    provider: 'codex' | 'claude' | 'opencode',
    connectionId: string,
  ): string {
    return join(
      configurationRoot,
      'workspaces',
      workspaceStorageDirectoryName(workspaceId),
      'runtimes',
      provider,
      createHash('sha256').update(connectionId).digest('hex'),
    );
  }

  function isolateLegacyCodexCredentials(current: IApplicationSettings): IApplicationSettings {
    let changed = false;
    const connections = current.connections.map((connection) => {
      if (connection.kind !== 'codex' || connection.credentialSource !== 'user-home') {
        return connection;
      }
      const accountRoot = isolatedRuntimeHome(connection.workspaceId, 'codex', connection.id);
      const source = join(homedir(), '.codex', 'auth.json');
      const destination = join(accountRoot, 'auth.json');
      mkdirSync(accountRoot, { recursive: true, mode: 0o700 });
      chmodSync(accountRoot, 0o700);
      if (existsSync(source) && !existsSync(destination)) {
        copyFileSync(source, destination);
        chmodSync(destination, 0o600);
      }
      changed = true;
      return { ...connection, credentialSource: 'isolated' as const };
    });
    return changed ? { ...current, connections } : current;
  }

  return Object.freeze({ isolatedRuntimeHome, isolateLegacyCodexCredentials });
}
