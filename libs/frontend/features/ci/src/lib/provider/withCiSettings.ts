// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
            get description() {
              return translateLabel(
                'loc.symphony.labels.this.mac.tools.storage.virtual.machines.updates.and..e89ed8d',
              );
            },
            order: 40,
          },
          search: [
            {
              id: 'resource-preset',
              get label() {
                return translateLabel('loc.symphony.labels.resource.preset.83de64e');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.cpus.memory.virtual.disk.and.shared.cache.of.each.ma.9289d2e',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.virtual.machines.0e39459');
              },
              keywords: ['compact', 'balanced', 'performance', 'custom', 'cpu', 'memory', 'disk'],
            },
            {
              id: 'reuse',
              get label() {
                return translateLabel('loc.symphony.labels.keep.the.virtual.machine.warm.3c8182d');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.reuse.a.provisioned.machine.instead.of.recreating.it.25b9afb',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.virtual.machines.0e39459');
              },
            },
            {
              id: 'clear-runner-data',
              get label() {
                return translateLabel('loc.symphony.labels.clear.runner.data.a93ff4a');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.inactive.linux.instances.cached.base.images.and.runn.1cdacc6',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.virtual.machines.0e39459');
              },
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
            get label() {
              return translateLabel('loc.symphony.labels.local.github.actions.f2564d3');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.run.eligible.workflows.of.this.workspace.in.a.dispos.f8ac314',
              );
            },
            order: 50,
          },
          search: [
            {
              id: 'enable-local-runs',
              get label() {
                return translateLabel('loc.symphony.labels.enable.local.runs.b6fcd21');
              },
              get group() {
                return translateLabel('loc.symphony.labels.activation.5d939d4');
              },
              keywords: ['local runner', 'GitHub Actions', 'virtual machine'],
            },
            {
              id: 'runner-image',
              get label() {
                return translateLabel('loc.symphony.labels.runner.image.c833729');
              },
              get group() {
                return translateLabel('loc.symphony.labels.guest.image.93a4ae1');
              },
              keywords: ['Ubuntu', 'Refresh catalog', 'guest image'],
            },
            {
              id: 'setup-script',
              get label() {
                return translateLabel('loc.symphony.labels.setup.script.af363a0');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.commands.each.repository.of.this.workspace.runs.insi.362a9c3',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.repository.setup.8dc2de4');
              },
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
