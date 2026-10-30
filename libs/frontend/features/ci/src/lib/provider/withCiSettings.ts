// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/** Contributes the actual machine specification and workspace-local-CI settings cards. @public */
export function withCiSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'ci-machine-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'virtual-machines-card',
          order: 0,
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
            import('../settings/views/VirtualMachinesCardView').then(
              (module) => module.VirtualMachinesCardView,
            ),
        },
      ],
    }),
    withSettingsViews({
      id: 'ci-workspace-settings',
      slot: SettingsViewSlot.Workspace,
      views: [
        {
          id: 'workspace-local-ci-card',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'local-ci',
            label: 'Local GitHub Actions',
            description: 'Run this workspace’s workflows locally.',
            order: 50,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'local-ci' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/views/WorkspaceLocalCiSettingsView').then(
              (module) => module.WorkspaceLocalCiSettingsView,
            ),
        },
      ],
    }),
  ];
}
