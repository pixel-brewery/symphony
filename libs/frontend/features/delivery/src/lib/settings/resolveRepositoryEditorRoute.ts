// #region Imports

import { inject } from '@angular/core';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import type { IRepositorySettingsEditorRequest } from './IRepositorySettingsEditorRequest';

// #endregion

/**
 * Resolves `?section=repositories&repository=<id>` to the sheet of that workspace's repository.
 *
 * @returns The resolver.
 * @public
 */
export function resolveRepositoryEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => IRepositorySettingsEditorRequest | undefined {
  const context = inject(DELIVERY_SETTINGS_CONTEXT);
  return (repositoryBindingId, workspaceId) => {
    const repository = context
      .settings()
      ?.repositoryBindings.find(
        (item) => item.id === repositoryBindingId && item.workspaceId === workspaceId,
      );
    return repository
      ? {
          kind: 'repository',
          workspaceId: repository.workspaceId,
          repositoryBindingId: repository.id,
        }
      : undefined;
  };
}
