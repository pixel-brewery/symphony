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
          order: 20,
          section: {
            scope: 'global',
            id: 'system',
            label: 'System',
            description: 'This Mac: tools, storage, virtual machines, updates and sleep.',
            order: 40,
          },
          search: [
            {
              id: 'developer-tools',
              label: 'Developer tools',
              description:
                'Check the local CLIs Symphony uses for repositories, GitHub, and AI accounts.',
              group: 'Developer tools',
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
            label: 'Appearance',
            description: 'Choose how Symphony looks.',
            order: 60,
          },
          search: [
            {
              id: 'theme',
              label: 'Theme',
              description:
                'Choose System to switch between light and dark automatically when macOS changes.',
              group: 'Color theme',
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
