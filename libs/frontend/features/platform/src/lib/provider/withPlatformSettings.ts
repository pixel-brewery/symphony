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
          order: 20,
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
              id: 'developer-tools',
              get label() {
                return translateLabel('loc.symphony.labels.developer.tools.96f0c06');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.check.the.local.clis.symphony.uses.for.repositories..5872d2a',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.developer.tools.96f0c06');
              },
              keywords: [
                'Homebrew',
                'Git',
                'GitHub CLI',
                'gh',
                'Codex CLI',
                'Claude Code CLI',
                'OpenCode CLI',
                'install',
              ],
            },
          ],
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
            get label() {
              return translateLabel('loc.symphony.labels.appearance.3907fa7');
            },
            get description() {
              return translateLabel('loc.symphony.labels.choose.how.symphony.looks.9230bf4');
            },
            order: 60,
          },
          search: [
            {
              id: 'theme',
              get label() {
                return translateLabel('loc.symphony.labels.theme.efb52e7');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.choose.system.to.switch.between.light.and.dark.autom.69bf560',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.color.theme.4750742');
              },
              keywords: ['light', 'dark', 'system', 'mode', 'appearance'],
              loadControl: () =>
                import('../settings/ThemeSegmentView').then((module) => module.ThemeSegmentView),
            },
          ],
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
