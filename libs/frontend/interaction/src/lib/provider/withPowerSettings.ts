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
        order: 50,
        section: {
          scope: 'global',
          id: 'system',
          label: 'System',
          description: 'This Mac: tools, storage, virtual machines, updates and sleep.',
          order: 40,
        },
        search: [
          {
            id: 'keep-awake',
            label: 'Keep this Mac awake while tasks run',
            description: 'The display may still turn off, and battery use rises while a task runs.',
            group: 'Sleep',
            keywords: ['sleep', 'caffeinate', 'power', 'battery', 'lid'],
            loadControl: () =>
              import('../views/KeepAwakeToggleView').then((module) => module.KeepAwakeToggleView),
          },
        ],
        canActivate: (selection) =>
          selection?.sectionId === 'system' && selection.workspaceId === null,
        loadComponent: () =>
          import('../views/PowerSettingsCardView').then((module) => module.PowerSettingsCardView),
      },
    ],
  });
}
