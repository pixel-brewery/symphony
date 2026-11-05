// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
            get label() {
              return translateLabel('loc.symphony.labels.mobile.access.f1a2806');
            },
            get description() {
              return translateLabel('loc.symphony.labels.pair.phones.on.the.local.network.440a80d');
            },
            order: 50,
          },
          search: [
            {
              id: 'allow',
              get label() {
                return translateLabel('loc.symphony.labels.allow.mobile.access.80ff9e0');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.make.symphony.available.only.to.phones.that.you.pair.2e75e0c',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.local.network.access.5b7fde2');
              },
              keywords: ['phone', 'wi-fi', 'network', 'iphone', 'android'],
            },
            {
              id: 'pair',
              get label() {
                return translateLabel('loc.symphony.labels.pair.a.phone.31a94a7');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.generate.a.short.lived.qr.code.then.approve.the.veri.9ce1a7d',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.pair.a.phone.31a94a7');
              },
              keywords: ['qr code', 'pairing', 'verification'],
            },
            {
              id: 'revoke',
              get label() {
                return translateLabel('loc.symphony.labels.paired.phones.969733d');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.revoke.a.phone.when.it.should.no.longer.reach.this.s.7306745',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.paired.phones.969733d');
              },
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
