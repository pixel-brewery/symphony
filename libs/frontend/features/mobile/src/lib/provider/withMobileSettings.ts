// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/**
 * Contributes Mobile's access and phone-pairing card to the native Settings host.
 *
 * @returns Mobile-owned global Settings contribution.
 * @public
 */
export function withMobileSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'mobile-access-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'MobileSettingsCardView',
          order: 10,
          section: {
            scope: 'global',
            id: 'mobile',
            label: 'Mobile access',
            description: 'Pair phones on the local network.',
            order: 50,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'mobile' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/MobileSettingsCardView').then(
              (module) => module.MobileSettingsCardView,
            ),
        },
      ],
    }),
  ];
}
