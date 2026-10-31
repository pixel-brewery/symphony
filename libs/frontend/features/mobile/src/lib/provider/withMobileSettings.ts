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
          search: [
            {
              id: 'allow',
              label: 'Allow mobile access',
              description: 'Make Symphony available only to phones that you pair and approve.',
              group: 'Local network access',
              keywords: ['phone', 'wi-fi', 'network', 'iphone', 'android'],
            },
            {
              id: 'pair',
              label: 'Pair a phone',
              description:
                'Generate a short-lived QR code, then approve the verification request shown here.',
              group: 'Pair a phone',
              keywords: ['qr code', 'pairing', 'verification'],
            },
            {
              id: 'revoke',
              label: 'Paired phones',
              description: 'Revoke a phone when it should no longer reach this Symphony Desktop.',
              group: 'Paired phones',
              keywords: ['revoke'],
            },
          ],
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
