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
import { translateLabel } from '@symphony/frontend-intl/labels';

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
            get label() {
              return translateLabel('loc.symphony.labels.ai.team.83e4e86');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.agents.responsibilities.skills.and.backup.order.73ccdf0',
              );
            },
            order: 10,
          },
          search: [
            {
              id: 'delivery-flow',
              get label() {
                return translateLabel('loc.symphony.labels.delivery.flow.05bd136');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.who.works.on.each.step.of.a.work.item.and.the.backup.6e6f991',
                );
              },
              keywords: ['steps', 'backup', 'who does what', 'responsibilities'],
            },
            {
              id: 'agents',
              get label() {
                return translateLabel('loc.symphony.labels.agents.279b44d');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.configure.the.ai.agents.in.this.workspace.their.posi.9b75fdb',
                );
              },
              keywords: ['agent', 'add an AI agent', 'model', 'effort', 'account', 'figure'],
            },
            {
              id: 'technical-ai-setup',
              get label() {
                return translateLabel('loc.symphony.labels.technical.ai.setup.a6f9d02');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.positions.providers.models.and.automatic.backup.rout.e681826',
                );
              },
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
