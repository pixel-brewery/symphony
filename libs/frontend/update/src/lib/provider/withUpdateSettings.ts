// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/**
 * Contributes the existing Updates card to its System settings section.
 *
 * @returns The native Settings contribution for this capability.
 * @public
 */
export function withUpdateSettings(): IFeature<SettingsFeatureKind> {
  return withSettingsViews({
    id: 'update-settings',
    slot: SettingsViewSlot.Global,
    views: [
      {
        id: 'update-settings-card',
        order: 20,
        section: {
          scope: 'global',
          id: 'system',
          label: 'System',
          description: 'Manage tools, storage, updates, and skill imports.',
          order: 40,
        },
        canActivate: (selection) => selection?.sectionId === 'system',
        loadComponent: () =>
          import('../views/UpdateSettingsCardView').then((module) => module.UpdateSettingsCardView),
      },
    ],
  });
}
