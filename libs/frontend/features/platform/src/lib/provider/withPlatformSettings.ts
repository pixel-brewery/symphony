// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/**
 * Contributes the actual feature-owned cards to the native Settings host.
 *
 * @public
 */
export function withPlatformSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'platform-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'developer-tools-settings-card',
          order: 11,
          section: {
            scope: 'global',
            id: 'system',
            label: 'System',
            description: 'Manage tools, storage, updates, and skill imports.',
            order: 40,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'system' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/DeveloperToolsSettingsView').then(
              (module) => module.DeveloperToolsSettingsView,
            ),
        },
        {
          id: 'AppearanceSettingsView',
          order: 10,
          section: {
            scope: 'global',
            id: 'appearance',
            label: 'Appearance',
            description: 'Choose how Symphony looks.',
            order: 60,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'appearance' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/AppearanceSettingsView').then(
              (module) => module.AppearanceSettingsView,
            ),
        },
      ],
    }),
  ];
}
