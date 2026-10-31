// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/**
 * Contributes the existing Sleep card to its System settings section.
 *
 * @returns The native Settings contribution for desktop power interaction.
 * @public
 */
export function withPowerSettings(): IFeature<SettingsFeatureKind> {
  return withSettingsViews({
    id: 'power-settings',
    slot: SettingsViewSlot.Global,
    views: [
      {
        id: 'power-settings-card',
        order: 30,
        section: {
          scope: 'global',
          id: 'system',
          label: 'System',
          description: 'Manage tools, storage, updates, and skill imports.',
          order: 40,
        },
        canActivate: (selection) => selection?.sectionId === 'system',
        loadComponent: () =>
          import('../views/PowerSettingsCardView').then((module) => module.PowerSettingsCardView),
      },
    ],
  });
}
