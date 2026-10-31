// #region Imports

import { describe, expect, it } from 'vitest';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { withoutAgent } from './';

// #endregion

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
          {
            role: 'solution',
            primaryAgentId: 'generalist',
            fallbackAgentIds: ['analyst'],
            skillId: 'solve',
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

describe('withoutAgent', () => {
  it('moves an owned role to an agent whose position allows it and drops it from fallbacks', () => {
    // arrange
    const next = withoutAgent(build(), 'analyst');

    // act
    const actual = next.agentProfiles.map((profile) => profile.id);

    // assert
    expect(actual).toEqual(['generalist']);
    expect(next.agentTeams[0]?.assignments).toEqual([
      { role: 'analysis', primaryAgentId: 'generalist', fallbackAgentIds: [], skillId: 'analyze' },
      { role: 'solution', primaryAgentId: 'generalist', fallbackAgentIds: [], skillId: 'solve' },
    ]);
  });

  it('drops the position and route policy the removed agent owned alone', () => {
    // arrange
    const next = withoutAgent(build(), 'analyst');

    // act
    const actual = next.positions.map((position) => position.id);

    // assert
    expect(actual).toEqual(['generalist-position']);
    expect(next.agentRoutePolicies.map((policy) => policy.id)).toEqual(['generalist-route']);
  });

  it('drops an assignment when no remaining position allows its role', () => {
    // act
    // arrange
    const settings = build({
      positions: [
        { id: 'analyst-position', allowedRoles: ['analysis'] },
        { id: 'solver-position', allowedRoles: ['solution'] },
      ],
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
          id: 'solver',
          workspaceId: 'personal',
          displayName: 'Solver',
          positionId: 'solver-position',
          routePolicyId: 'generalist-route',
          enabled: true,
        },
      ],
      agentTeams: [
        {
          id: 'team',
          workspaceId: 'personal',
          assignments: [
            { role: 'analysis', primaryAgentId: 'analyst', fallbackAgentIds: [], skillId: 'a' },
            { role: 'solution', primaryAgentId: 'solver', fallbackAgentIds: [], skillId: 'solve' },
          ],
        },
      ],
    } as unknown as Partial<ApplicationSettingsDto>);

    // assert
    expect(withoutAgent(settings, 'analyst').agentTeams[0]?.assignments).toEqual([
      { role: 'solution', primaryAgentId: 'solver', fallbackAgentIds: [], skillId: 'solve' },
    ]);
  });
});
