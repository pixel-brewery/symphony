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
            label: 'Workspaces',
            description: 'Open or add a separate company workspace.',
            order: 10,
          },
          search: [
            {
              id: 'add-workspace',
              label: 'Add workspace',
              description:
                'Open one workspace to manage its organization, accounts, repositories and storage in isolation.',
              keywords: ['new', 'company', 'organization'],
            },
            {
              id: 'import-workspace',
              label: 'Import workspace',
              description: 'Replace a matching workspace with a portable configuration bundle.',
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
            label: 'Connected services',
            description: 'Ticket sources, source control, and feedback intake.',
            order: 20,
          },
          search: [
            {
              id: 'boards',
              label: 'Boards',
              description:
                'Each board is one GitHub Project or Azure DevOps query. Columns follow the project; map them to workflow states in the board editor.',
              keywords: ['GitHub Projects board', 'Add board', 'columns', 'work items'],
            },
            {
              id: 'connected-services',
              label: 'Connected services',
              description:
                'Ticket sources, source-code accounts, and the AI accounts every agent in this workspace can run on.',
              keywords: ['account', 'GitHub', 'Azure DevOps', 'sign in', 'remove account'],
            },
            {
              id: 'feedback-intake',
              label: 'Feedback intake',
              description: 'Turn requested FLAMOX365 feedback from Microsoft Teams into tickets',
              keywords: ['Microsoft Teams', 'channel', 'feedback'],
            },
            {
              id: 'add-a-service',
              label: 'Add a service',
              description:
                'Connect an AI account, another ticket source, or a source-code account.',
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
            label: 'Administration',
            description: 'Workspace storage, export, and deletion.',
            order: 60,
          },
          search: [
            {
              id: 'storage',
              label: 'Maximum workspace size (GB)',
              description: 'Between 2 and 1024 GB.',
              group: 'Storage',
              keywords: ['storage', 'limit', 'disk', 'space'],
            },
            {
              id: 'delivery-grouping',
              label: 'Automatically activate safe groups',
              description:
                'Analyzer suggestions are always shown on the board. Opt in only when fully compatible tickets may start one shared delivery workflow without a second confirmation.',
              group: 'Delivery grouping',
            },
            {
              id: 'edit-workspace',
              label: 'Edit workspace',
              description: 'Name, icon, and color.',
              group: 'Workspace',
              keywords: ['rename', 'icon', 'emoji', 'monogram', 'color', 'appearance'],
            },
            {
              id: 'use-only-this-workspace',
              label: 'Use only this workspace',
              group: 'Workspace',
              keywords: ['scope', 'focus'],
            },
            {
              id: 'export-workspace',
              label: 'Export workspace',
              description: 'Stored credential fields and machine-local paths are excluded.',
              group: 'Workspace',
              keywords: ['bundle', 'backup'],
            },
            {
              id: 'delete-workspace',
              label: 'Delete workspace',
              description:
                'Permanently removes its connections, execution history, managed worktrees, and isolated AI account data.',
              group: 'Workspace',
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
