// #region Imports

import { describe, expect, it } from 'vitest';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { agentRemovalBlockers } from './';

// #endregion

describe('agentRemovalBlockers', () => {
  it('refuses to remove the last agent of a workspace', () => {
    // arrange
    const settings = build({
      agentProfiles: [
        {
          id: 'analyst',
          workspaceId: 'personal',
          displayName: 'Analyst',
          positionId: 'analyst-position',
          routePolicyId: 'analyst-route',
          enabled: true,
        },
      ],
    } as unknown as Partial<ApplicationSettingsDto>);

    // act
    const actual = agentRemovalBlockers(settings, 'analyst');

    // assert
    expect(actual).toEqual(['last-agent']);
  });

  it('refuses removal that would leave an enabled feedback intake without a work-item creator', () => {
    // arrange
    const settings = build({
      positions: [
        { id: 'analyst-position', allowedRoles: ['work-item-creation'] },
        { id: 'generalist-position', allowedRoles: ['analysis'] },
      ],
      agentTeams: [
        {
          id: 'team',
          workspaceId: 'personal',
          assignments: [
            {
              role: 'work-item-creation',
              primaryAgentId: 'analyst',
              fallbackAgentIds: [],
              skillId: 'create',
            },
          ],
        },
      ],
      feedbackIntakeSources: [{ id: 'intake', workspaceId: 'personal', enabled: true }],
    } as unknown as Partial<ApplicationSettingsDto>);

    // act
    const actual = agentRemovalBlockers(settings, 'analyst');

    // assert
    expect(actual).toEqual(['work-item-creation']);
    expect(agentRemovalBlockers(build(), 'analyst')).toEqual([]);
  });
});

function build(overrides: Partial<ApplicationSettingsDto> = {}): ApplicationSettingsDto {
  return {
    positions: [
      { id: 'analyst-position', allowedRoles: ['analysis'] },
      { id: 'generalist-position', allowedRoles: ['analysis', 'solution'] },
    ],
    agentRoutePolicies: [{ id: 'analyst-route' }, { id: 'generalist-route' }],
    agentProfiles: [
      {
        id: 'analyst',
        workspaceId: 'personal',
        displayName: 'Analyst',
        positionId: 'analyst-position',
        routePolicyId: 'analyst-route',
        enabled: true,
      },
      {
        id: 'generalist',
        workspaceId: 'personal',
        displayName: 'Generalist',
        positionId: 'generalist-position',
        routePolicyId: 'generalist-route',
        enabled: true,
      },
    ],
    agentTeams: [
      {
        id: 'team',
        workspaceId: 'personal',
        assignments: [
          {
            role: 'analysis',
            primaryAgentId: 'analyst',
            fallbackAgentIds: ['generalist'],
            skillId: 'analyze',
          },
        ],
      },
    ],
    deliveryContexts: [
      { id: 'delivery', workspaceId: 'personal', agentTeamId: 'team', enabled: true },
    ],
    feedbackIntakeSources: [],
    ...overrides,
  } as unknown as ApplicationSettingsDto;
}
