// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';
import { primaryDeliveryContext } from './primaryDeliveryContext';

// #endregion

export function repositoryBindingsFor(
  settings: IApplicationSettings,
  workItem: Pick<IWorkItem, 'repositoryBindingIds' | 'repository' | 'workspaceId'>,
): readonly IRepositoryBinding[] {
  const explicitIds = new Set(workItem.repositoryBindingIds ?? []);
  const explicit = settings.repositoryBindings.filter(
    (binding) =>
      binding.enabled &&
      binding.workspaceId === workItem.workspaceId &&
      explicitIds.has(binding.id),
  );
  if (explicit.length) return explicit;
  const inWorkspace = settings.repositoryBindings.filter(
    (binding) => binding.enabled && binding.workspaceId === workItem.workspaceId,
  );
  const named = inWorkspace.filter(
    (binding) =>
      binding.id === workItem.repository ||
      binding.displayName === workItem.repository ||
      `${binding.owner}/${binding.name}` === workItem.repository,
  );
  if (named.length) return named;
  const context = primaryDeliveryContext(settings, workItem.workspaceId);
  const defaultRepository = inWorkspace.find(
    (binding) => binding.id === context?.defaultRepositoryBindingId,
  );
  if (defaultRepository) return [defaultRepository];
  return inWorkspace.length === 1 ? inWorkspace : [];
}
