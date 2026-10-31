// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { agentSearchEntries } from '../settings/agentSearchEntries';
import { isTeamSettingsEditorRequest } from '../settings/isTeamSettingsEditorRequest';
import { resolveAgentEditorRoute } from '../settings/resolveAgentEditorRoute';

// #endregion

/**
 * Contributes the `AI team` section with one `Search settings` entry per agent, its `?agent=`
 * route initializer and the agent sheet to Settings.
 *
 * @public
 */
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
          search: [
            {
              id: 'delivery-flow',
              label: 'Delivery flow',
              description: 'Who works on each step of a work item, and the backup after them.',
              keywords: ['steps', 'backup', 'who does what', 'responsibilities'],
            },
            {
              id: 'agents',
              label: 'Agents',
              description:
                'Configure the AI agents in this workspace, their positions, responsibilities, and skills.',
              keywords: ['agent', 'add an AI agent', 'model', 'effort', 'account', 'figure'],
            },
            {
              id: 'technical-ai-setup',
              label: 'Technical AI setup',
              description: 'Positions, providers, models, and automatic backup routes',
              keywords: ['positions', 'permissions', 'AI services', 'backup order', 'routing'],
            },
          ],
          searchEntries: agentSearchEntries,
          canActivate: (selection) => selection?.sectionId === 'team' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/TeamSettingsCardView').then(
              (module) => module.TeamSettingsCardView,
            ),
        },
      ],
    }),
    withSettingsEditorRoute({
      id: 'team-settings-route',
      section: 'team',
      parameter: 'agent',
      matchesWithoutSection: true,
      resolve: resolveAgentEditorRoute,
    }),
    withSettingsEditor({
      id: 'team-settings-editor',
      kind: 'ai',
      width: '920px',
      isRequest: isTeamSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/TeamSettingsEditorView').then(
          (module) => module.TeamSettingsEditorView,
        ),
    }),
  ];
}
