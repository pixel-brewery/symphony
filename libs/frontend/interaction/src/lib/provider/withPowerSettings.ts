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
          get description() {
            return translateLabel(
              'loc.symphony.labels.this.mac.tools.storage.virtual.machines.updates.and..e89ed8d',
            );
          },
          order: 40,
        },
        search: [
          {
            id: 'keep-awake',
            get label() {
              return translateLabel(
                'loc.symphony.labels.keep.this.mac.awake.while.tasks.run.b2457a9',
              );
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.the.display.may.still.turn.off.and.battery.use.rises.9081cc3',
              );
            },
            get group() {
              return translateLabel('loc.symphony.labels.sleep.d466bcf');
            },
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
