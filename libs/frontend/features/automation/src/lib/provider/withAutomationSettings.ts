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
export function withAutomationSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'automation-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'AutomationPolicySettingsView',
          order: 10,
          section: {
            scope: 'global',
            id: 'automation',
            label: 'Automation',
            description: 'Control unattended work and delivery policies.',
            order: 20,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'automation' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/AutomationPolicySettingsView').then(
              (module) => module.AutomationPolicySettingsView,
            ),
        },
        {
          id: 'StorageSafetySettingsView',
          order: 10,
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
            import('../settings/StorageSafetySettingsView').then(
              (module) => module.StorageSafetySettingsView,
            ),
        },
      ],
    }),
  ];
}
