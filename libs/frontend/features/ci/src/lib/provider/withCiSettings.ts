// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/** Contributes System's virtual machines and the workspace Local GitHub Actions cards. @public */
export function withCiSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'ci-machine-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'virtual-machines-card',
          order: 30,
          section: {
            scope: 'global',
            id: 'system',
            label: 'System',
            description: 'This Mac: tools, storage, virtual machines, updates and sleep.',
            order: 40,
          },
          search: [
            {
              id: 'resource-preset',
              label: 'Resource preset',
              description: 'CPUs, memory, virtual disk and shared cache of each machine.',
              group: 'Virtual machines',
              keywords: ['compact', 'balanced', 'performance', 'custom', 'cpu', 'memory', 'disk'],
            },
            {
              id: 'reuse',
              label: 'Keep the virtual machine warm',
              description:
                'Reuse a provisioned machine instead of recreating it; it keeps its full disk until you remove it.',
              group: 'Virtual machines',
            },
            {
              id: 'clear-runner-data',
              label: 'Clear runner data',
              description:
                'Inactive Linux instances, cached base images, and runner tools are removed.',
              group: 'Virtual machines',
              keywords: ['machines', 'cleanup'],
            },
          ],
          canActivate: (selection) =>
            selection?.sectionId === 'system' && selection.workspaceId === null,
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
            description:
              'Run eligible workflows of this workspace in a disposable Linux virtual machine on this Mac.',
            order: 50,
          },
          search: [
            {
              id: 'enable-local-runs',
              label: 'Enable local runs',
              group: 'Activation',
              keywords: ['local runner', 'GitHub Actions', 'virtual machine'],
            },
            {
              id: 'runner-image',
              label: 'Runner image',
              group: 'Guest image',
              keywords: ['Ubuntu', 'Refresh catalog', 'guest image'],
            },
            {
              id: 'setup-script',
              label: 'Setup script',
              description:
                'Commands each repository of this workspace runs inside the guest after the image baseline and before any workflow step.',
              group: 'Repository setup',
              keywords: ['provision', 'bash', 'apt-get'],
            },
          ],
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
