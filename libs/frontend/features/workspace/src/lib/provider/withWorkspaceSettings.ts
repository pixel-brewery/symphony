// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { isWorkspaceSettingsEditorRequest } from '../settings/isWorkspaceSettingsEditorRequest';
import { resolveWorkspaceEditorRoute } from '../settings/resolveWorkspaceEditorRoute';
import { workspaceSearchEntries } from '../settings/workspaceSearchEntries';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Contributes Workspace's actual directory with one `Search settings` entry per workspace,
 * administration and create/edit surfaces, and the `?edit=` route of the `Edit workspace` sheet.
 *
 * @public
 */
export function withWorkspaceSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'workspace-directory-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'workspace-directory',
          order: 10,
          section: {
            scope: 'global',
            id: 'workspaces',
            get label() {
              return translateLabel('loc.symphony.labels.workspaces.1377264');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.open.or.add.a.separate.company.workspace.a28cbe3',
              );
            },
            order: 10,
          },
          search: [
            {
              id: 'add-workspace',
              get label() {
                return translateLabel('loc.symphony.labels.add.workspace.926afb3');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.open.one.workspace.to.manage.its.organization.accoun.2b64e74',
                );
              },
              keywords: ['new', 'company', 'organization'],
            },
            {
              id: 'import-workspace',
              get label() {
                return translateLabel('loc.symphony.labels.import.workspace.3775664');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.replace.a.matching.workspace.with.a.portable.configu.b909ad1',
                );
              },
              keywords: ['bundle', 'import'],
            },
          ],
          searchEntries: workspaceSearchEntries,
          canActivate: (selection) =>
            selection?.sectionId === 'workspaces' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/WorkspaceDirectoryCardView').then(
              (module) => module.WorkspaceDirectoryCardView,
            ),
        },
      ],
    }),
    withSettingsViews({
      id: 'workspace-services-settings',
      slot: SettingsViewSlot.Workspace,
      views: [
        {
          id: 'workspace-services',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'services',
            get label() {
              return translateLabel('loc.symphony.labels.connected.services.5da7ca5');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.ticket.sources.source.control.and.feedback.intake.ae50600',
              );
            },
            order: 20,
          },
          search: [
            {
              id: 'boards',
              get label() {
                return translateLabel('loc.symphony.labels.boards.4fcd39d');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.each.board.is.one.github.project.or.azure.devops.que.61524ba',
                );
              },
              keywords: ['GitHub Projects board', 'Add board', 'columns', 'work items'],
            },
            {
              id: 'connected-services',
              get label() {
                return translateLabel('loc.symphony.labels.connected.services.5da7ca5');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.ticket.sources.source.code.accounts.and.the.ai.accou.a1c74e0',
                );
              },
              keywords: ['account', 'GitHub', 'Azure DevOps', 'sign in', 'remove account'],
            },
            {
              id: 'feedback-intake',
              get label() {
                return translateLabel('loc.symphony.labels.feedback.intake.bde58af');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.turn.requested.teams.feedback.from.microsoft.teams.i.b8a9a2c',
                );
              },
              keywords: ['Microsoft Teams', 'channel', 'feedback'],
            },
            {
              id: 'add-a-service',
              get label() {
                return translateLabel('loc.symphony.labels.add.a.service.066ae41');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.connect.an.ai.account.another.ticket.source.or.a.sou.f8514f6',
                );
              },
              keywords: [
                'Codex',
                'Claude Code',
                'OpenCode',
                'Azure DevOps',
                'connect',
                'AI account',
              ],
            },
          ],
          canActivate: (selection) =>
            selection?.sectionId === 'services' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/WorkspaceServicesCardView').then(
              (module) => module.WorkspaceServicesCardView,
            ),
        },
      ],
    }),
    withSettingsViews({
      id: 'workspace-administration-settings',
      slot: SettingsViewSlot.Workspace,
      views: [
        {
          id: 'workspace-administration',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'administration',
            get label() {
              return translateLabel('loc.symphony.labels.administration.4b42c66');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.workspace.storage.export.and.deletion.4af73df',
              );
            },
            order: 60,
          },
          search: [
            {
              id: 'storage',
              get label() {
                return translateLabel('loc.symphony.labels.maximum.workspace.size.gb.56a7428');
              },
              get description() {
                return translateLabel('loc.symphony.labels.between.2.and.1024.gb.08c9a67');
              },
              get group() {
                return translateLabel('loc.symphony.labels.storage.a69c4de');
              },
              keywords: ['storage', 'limit', 'disk', 'space'],
            },
            {
              id: 'delivery-grouping',
              get label() {
                return translateLabel(
                  'loc.symphony.labels.automatically.activate.safe.groups.c1d56ca',
                );
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.analyzer.suggestions.are.always.shown.on.the.board.o.d304b46',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.delivery.grouping.ffe4e2e');
              },
            },
            {
              id: 'edit-workspace',
              get label() {
                return translateLabel('loc.symphony.labels.edit.workspace.52e3ba9');
              },
              get description() {
                return translateLabel('loc.symphony.labels.name.icon.and.color.f3c3efa');
              },
              get group() {
                return translateLabel('loc.symphony.labels.workspace.87bb59b');
              },
              keywords: ['rename', 'icon', 'emoji', 'monogram', 'color', 'appearance'],
            },
            {
              id: 'use-only-this-workspace',
              get label() {
                return translateLabel('loc.symphony.labels.use.only.this.workspace.0b0a94b');
              },
              get group() {
                return translateLabel('loc.symphony.labels.workspace.87bb59b');
              },
              keywords: ['scope', 'focus'],
            },
            {
              id: 'export-workspace',
              get label() {
                return translateLabel('loc.symphony.labels.export.workspace.ae29651');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.stored.credential.fields.and.machine.local.paths.are.3dd9deb',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.workspace.87bb59b');
              },
              keywords: ['bundle', 'backup'],
            },
            {
              id: 'delete-workspace',
              get label() {
                return translateLabel('loc.symphony.labels.delete.workspace.55f033d');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.permanently.removes.its.connections.execution.histor.085f5df',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.workspace.87bb59b');
              },
              keywords: ['remove workspace'],
            },
          ],
          canActivate: (selection) =>
            selection?.sectionId === 'administration' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/WorkspaceAdministrationCardView').then(
              (module) => module.WorkspaceAdministrationCardView,
            ),
        },
      ],
    }),
    withSettingsEditor({
      id: 'workspace-editor',
      kind: 'workspace',
      width: '600px',
      isRequest: isWorkspaceSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/WorkspaceSettingsEditorView').then(
          (module) => module.WorkspaceSettingsEditorView,
        ),
    }),
    withSettingsEditorRoute({
      id: 'workspace-editor-route',
      section: 'workspaces',
      parameter: 'edit',
      resolve: resolveWorkspaceEditorRoute,
    }),
  ];
}
