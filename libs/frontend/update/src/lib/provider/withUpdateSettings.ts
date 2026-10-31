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
        order: 40,
        section: {
          scope: 'global',
          id: 'system',
          label: 'System',
          description: 'This Mac: tools, storage, virtual machines, updates and sleep.',
          order: 40,
        },
        search: [
          {
            id: 'check',
            label: 'Check for updates',
            description: 'The installed version and whether a new one is available.',
            group: 'Updates',
            keywords: ['version', 'release', 'download', 'install'],
          },
          {
            id: 'channel',
            label: 'Release channel',
            description:
              'Stable receives tested releases. Canary receives every successful main build and may change more frequently.',
            group: 'Updates',
            keywords: ['stable', 'canary'],
          },
        ],
        canActivate: (selection) =>
          selection?.sectionId === 'system' && selection.workspaceId === null,
        loadComponent: () =>
          import('../views/UpdateSettingsCardView').then((module) => module.UpdateSettingsCardView),
      },
    ],
  });
}
