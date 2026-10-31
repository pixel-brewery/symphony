// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { describe, expect, it } from 'vitest';
import { SkillsContext } from './SkillsContext';

// #endregion

describe('SkillsContext', () => {
  it('resolves the team the orchestrator uses for every enabled workspace, each team once', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
    const workspace = settings.workspaces[0]!;
    const team = settings.agentTeams[0]!;
    settings.workspaces = [
      workspace,
      { ...workspace, id: 'client', displayName: 'Client' },
      { ...workspace, id: 'archive', displayName: 'Archive', enabled: false },
    ];
    settings.agentTeams = [
      team,
      { ...team, id: 'client-team', workspaceId: 'client' },
      { ...team, id: 'client-delivery-team', workspaceId: 'client' },
      { ...team, id: 'archive-team', workspaceId: 'archive' },
    ];
    settings.deliveryContexts = [
      {
        id: 'client-delivery',
        workspaceId: 'client',
        displayName: 'Delivery',
        workItemSourceIds: [],
        repositoryBindingIds: [],
        ciBindingIds: [],
        agentTeamId: 'client-delivery-team',
        enabled: true,
      },
    ];
    const configuration = {
      settings: signal(settings),
      configurationBusy: signal(false),
    } as unknown as ConfigurationStore;
    const snapshot = { snapshot: signal(undefined) } as unknown as ApplicationSnapshot;

    // act
    const teams = new SkillsContext(configuration, snapshot).workspaceTeams();

    // assert
    expect(
      teams.map(({ workspaceId, workspaceName, team: entry }) => [
        workspaceId,
        workspaceName,
        entry.id,
      ]),
    ).toEqual([
      [workspace.id, workspace.displayName, team.id],
      ['client', 'Client', 'client-delivery-team'],
    ]);
  });
});
