// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';

// #endregion

const KIND_LABELS = {
  environment: 'Environment',
  'release-channel': 'Release channel',
  installation: 'Installation',
} as const;

/**
 * One `Search settings` entry per delivery destination in `Delivery destinations`, grouped by its
 * project, with its environment as value; the result opens the destination's sheet.
 *
 * @returns The entries of every workspace's delivery destinations.
 * @public
 */
export function deliveryTargetSearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const context = inject(DELIVERY_SETTINGS_CONTEXT);
  return computed(() => {
    const settings = context.settings();
    if (!settings) return [];
    return settings.deliveryTargets.flatMap((target): ISettingsSearchEntry[] => {
      const repository = settings.repositoryBindings.find(
        (item) => item.id === target.repositoryBindingId,
      );
      if (!repository) return [];
      return [
        {
          id: `delivery-target-${target.id}`,
          label: target.displayName,
          description: `${target.production ? 'Production · ' : ''}${KIND_LABELS[target.kind]}`,
          group: repository.displayName,
          keywords: [
            'destination',
            KIND_LABELS[target.kind],
            ...(target.production ? ['Production'] : []),
          ],
          ...(target.kind === 'environment' && target.environment
            ? { value: target.environment }
            : {}),
          workspaceId: target.workspaceId,
          parameters: { repository: repository.id, target: target.id },
        },
      ];
    });
  });
}
