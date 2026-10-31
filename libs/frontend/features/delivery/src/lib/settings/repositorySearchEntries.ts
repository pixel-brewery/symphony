// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';

// #endregion

/**
 * One `Search settings` entry per repository in `Repositories`, found by name, owner and
 * repository; a disabled repository says so, and the result opens the repository's sheet.
 *
 * @returns The entries of every workspace's repositories.
 * @public
 */
export function repositorySearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const context = inject(DELIVERY_SETTINGS_CONTEXT);
  return computed(() =>
    (context.settings()?.repositoryBindings ?? []).map((repository): ISettingsSearchEntry => ({
      id: `repository-${repository.id}`,
      label: repository.displayName,
      description: `${repository.owner}/${repository.name}`,
      group: 'Repositories',
      keywords: ['repository', repository.host, repository.defaultBranch],
      ...(repository.enabled ? {} : { value: 'Disabled' }),
      workspaceId: repository.workspaceId,
      parameters: { repository: repository.id },
    })),
  );
}
