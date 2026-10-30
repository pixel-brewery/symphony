// #region Imports

import type { Settings } from './Settings';

// #endregion

/**
 * Removes the repository binding and, with it, the source-control connection that exists only
 * to carry it. A connection shared by another repository or by a ticket source is kept.
 */
export function withoutRepository(settings: Settings, repositoryBindingId: string): Settings {
  const removed = settings.repositoryBindings.find(
    (repository) => repository.id === repositoryBindingId,
  );
  if (!removed) return settings;
  const repositoryBindings = settings.repositoryBindings.filter(
    (repository) => repository.id !== repositoryBindingId,
  );
  const connectionStillUsed =
    repositoryBindings.some(
      (repository) => repository.sourceControlConnectionId === removed.sourceControlConnectionId,
    ) ||
    settings.workItemSources.some(
      (source) => source.connectionId === removed.sourceControlConnectionId,
    ) ||
    settings.ciBindings.some(
      (binding) =>
        binding.repositoryBindingId !== repositoryBindingId &&
        binding.sourceControlConnectionId === removed.sourceControlConnectionId,
    );
  return {
    ...settings,
    repositoryBindings,
    deliveryTargets: settings.deliveryTargets.filter(
      (target) => target.repositoryBindingId !== repositoryBindingId,
    ),
    ciBindings: settings.ciBindings.filter(
      (binding) => binding.repositoryBindingId !== repositoryBindingId,
    ),
    connections: connectionStillUsed
      ? settings.connections
      : settings.connections.filter(
          (connection) => connection.id !== removed.sourceControlConnectionId,
        ),
    deliveryContexts: settings.deliveryContexts.map((context) => ({
      ...context,
      repositoryBindingIds: context.repositoryBindingIds.filter((id) => id !== repositoryBindingId),
      ...(context.defaultRepositoryBindingId === repositoryBindingId
        ? { defaultRepositoryBindingId: undefined }
        : {}),
    })),
  };
}
