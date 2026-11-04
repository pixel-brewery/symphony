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
          get description() {
            return translateLabel(
              'loc.symphony.labels.this.mac.tools.storage.virtual.machines.updates.and..e89ed8d',
            );
          },
          order: 40,
        },
        search: [
          {
            id: 'check',
            get label() {
              return translateLabel('loc.symphony.labels.check.for.updates.f26f327');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.the.installed.version.and.whether.a.new.one.is.avail.9ad26ed',
              );
            },
            get group() {
              return translateLabel('loc.symphony.labels.updates.22e2bad');
            },
            keywords: ['version', 'release', 'download', 'install'],
          },
          {
            id: 'channel',
            get label() {
              return translateLabel('loc.symphony.labels.release.channel.d89ba8a');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.stable.receives.tested.releases.canary.receives.ever.b380e5a',
              );
            },
            get group() {
              return translateLabel('loc.symphony.labels.updates.22e2bad');
            },
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
