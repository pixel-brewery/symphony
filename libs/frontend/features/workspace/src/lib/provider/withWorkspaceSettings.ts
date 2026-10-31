// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { isWorkspaceSettingsEditorRequest } from '../settings/isWorkspaceSettingsEditorRequest';

// #endregion

/**
 * Contributes Workspace's actual directory, administration and create/edit surfaces.
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
      isRequest: isWorkspaceSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/WorkspaceSettingsEditorView').then(
          (module) => module.WorkspaceSettingsEditorView,
        ),
    }),
  ];
}
