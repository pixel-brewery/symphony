// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsRouteInitializer,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { isTeamSettingsEditorRequest } from '../settings/isTeamSettingsEditorRequest';
import { initializeTeamSettingsRoute } from '../settings/initializeTeamSettingsRoute';

// #endregion

/** Contributes the feature-owned editor without a business-kind switch in the host. @public */
export function withTeamSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'workspace-team-settings',
      slot: SettingsViewSlot.Workspace,
      views: [
        {
          id: 'workspace-team',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'team',
            label: 'AI team',
            description: 'Agents, responsibilities, skills, and backup order.',
            order: 10,
          },
          canActivate: (selection) => selection?.sectionId === 'team' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/TeamSettingsCardView').then(
              (module) => module.TeamSettingsCardView,
            ),
        },
      ],
    }),
    withSettingsRouteInitializer({
      id: 'team-settings-route',
      initialize: initializeTeamSettingsRoute,
    }),
    withSettingsEditor({
      id: 'team-settings-editor',
      kind: 'ai',
      isRequest: isTeamSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/TeamSettingsEditorView').then(
          (module) => module.TeamSettingsEditorView,
        ),
    }),
  ];
}
