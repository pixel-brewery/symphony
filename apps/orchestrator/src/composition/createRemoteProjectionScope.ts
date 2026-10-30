// #region Imports
import { type ProviderConnection } from '@symphony/configuration-composition';
import { createHash } from 'node:crypto';
import { type ICreateRemoteProjectionScopeDependencies } from './ICreateRemoteProjectionScopeDependencies';
// #endregion

/**
 * Owns projectionScope commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createRemoteProjectionScope(
  dependencies: ICreateRemoteProjectionScopeDependencies,
) {
  const { settingsState } = dependencies;
  function remoteProjectionScope(): {
    readonly workspaceIds: readonly string[];
    readonly workTracking: string;
    readonly pullRequests: string;
    readonly continuousIntegration: string;
  } {
    const workspaceIds = [...settingsState.current.activeViewScope.workspaceIds].sort();
    const selected = new Set(workspaceIds);
    const workItemSources = settingsState.current.workItemSources
      .filter((source) => source.enabled && selected.has(source.workspaceId))
      .map((source) => {
        switch (source.provider) {
          case 'azure-devops':
            return {
              id: source.id,
              workspaceId: source.workspaceId,
              connectionId: source.connectionId,
              provider: source.provider,
              project: source.project,
              team: source.team,
              queryId: source.queryId,
              wiql: source.wiql,
              boardId: source.boardId,
              columnMappings: source.columnMappings ?? [],
            };
          case 'github-projects':
            return {
              id: source.id,
              workspaceId: source.workspaceId,
              connectionId: source.connectionId,
              provider: source.provider,
              ownerType: source.ownerType,
              owner: source.owner,
              projectNumber: source.projectNumber,
              columnMappings: source.columnMappings ?? [],
            };
          case 'simulated':
            return {
              id: source.id,
              workspaceId: source.workspaceId,
              connectionId: source.connectionId,
              provider: source.provider,
              project: source.project,
            };
        }
      })
      .toSorted((left, right) => left.id.localeCompare(right.id));
    const workTrackingConnectionIds = new Set(workItemSources.map((source) => source.connectionId));
    const workTrackingConnections = settingsState.current.connections
      .filter((connection) => workTrackingConnectionIds.has(connection.id))
      .map(projectionConnectionIdentity)
      .toSorted((left, right) => left.id.localeCompare(right.id));
    const pullRequestRepositories = settingsState.current.repositoryBindings
      .filter(
        (repository) =>
          repository.enabled &&
          repository.provider === 'github' &&
          selected.has(repository.workspaceId),
      )
      .map((repository) => ({
        id: repository.id,
        workspaceId: repository.workspaceId,
        sourceControlConnectionId: repository.sourceControlConnectionId,
        provider: repository.provider,
        host: repository.host,
        owner: repository.owner,
        name: repository.name,
      }))
      .toSorted((left, right) => left.id.localeCompare(right.id));
    const pullRequestConnectionIds = new Set(
      pullRequestRepositories.map((repository) => repository.sourceControlConnectionId),
    );
    const pullRequestConnections = settingsState.current.connections
      .filter((connection) => pullRequestConnectionIds.has(connection.id))
      .map(projectionConnectionIdentity)
      .toSorted((left, right) => left.id.localeCompare(right.id));
    const ciBindings = settingsState.current.ciBindings
      .filter((binding) => binding.enabled && selected.has(binding.workspaceId))
      .map((binding) => ({
        id: binding.id,
        workspaceId: binding.workspaceId,
        repositoryBindingId: binding.repositoryBindingId,
        sourceControlConnectionId: binding.sourceControlConnectionId,
        provider: binding.provider,
      }))
      .toSorted((left, right) => left.id.localeCompare(right.id));
    const repositoryIds = new Set(ciBindings.map((binding) => binding.repositoryBindingId));
    const ciConnectionIds = new Set(ciBindings.map((binding) => binding.sourceControlConnectionId));
    const repositories = settingsState.current.repositoryBindings
      .filter((repository) => repositoryIds.has(repository.id))
      .map((repository) => ({
        id: repository.id,
        workspaceId: repository.workspaceId,
        sourceControlConnectionId: repository.sourceControlConnectionId,
        provider: repository.provider,
        host: repository.host,
        owner: repository.owner,
        name: repository.name,
      }))
      .toSorted((left, right) => left.id.localeCompare(right.id));
    const ciConnections = settingsState.current.connections
      .filter((connection) => ciConnectionIds.has(connection.id))
      .map(projectionConnectionIdentity)
      .toSorted((left, right) => left.id.localeCompare(right.id));
    return {
      workspaceIds,
      workTracking: projectionFingerprint({
        workspaceIds,
        workItemSources,
        workTrackingConnections,
      }),
      pullRequests: projectionFingerprint({
        workspaceIds,
        repositories: pullRequestRepositories,
        connections: pullRequestConnections,
      }),
      continuousIntegration: projectionFingerprint({
        workspaceIds,
        ciBindings,
        repositories,
        ciConnections,
      }),
    };
  }

  function projectionConnectionIdentity(connection: ProviderConnection) {
    switch (connection.kind) {
      case 'azure-devops':
        return {
          id: connection.id,
          workspaceId: connection.workspaceId,
          kind: connection.kind,
          organization: connection.organization,
          tenantId: connection.tenantId,
        };
      case 'github':
        return {
          id: connection.id,
          workspaceId: connection.workspaceId,
          kind: connection.kind,
          hostname: connection.hostname,
        };
      case 'codex':
      case 'claude':
      case 'opencode':
        return {
          id: connection.id,
          workspaceId: connection.workspaceId,
          kind: connection.kind,
        };
    }
  }

  function projectionFingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  return Object.freeze({ remoteProjectionScope });
}
