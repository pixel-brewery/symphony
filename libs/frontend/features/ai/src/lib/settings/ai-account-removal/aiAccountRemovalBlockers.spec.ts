// #region Imports

import { describe, expect, it } from 'vitest';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { aiAccountRemovalBlockers } from './';

// #endregion

const settings = {
  connections: [
    { id: 'codex-a', workspaceId: 'personal', kind: 'codex', displayName: 'Codex A' },
    { id: 'claude-b', workspaceId: 'personal', kind: 'claude', displayName: 'Claude B' },
  ],
  agentRoutePolicies: [
    {
      id: 'solo-route',
      workspaceId: 'personal',
      displayName: 'Solo route',
      candidates: [{ id: 'c1', aiConnectionId: 'codex-a', priority: 0 }],
    },
    {
      id: 'backed-route',
      workspaceId: 'personal',
      displayName: 'Backed route',
      candidates: [
        { id: 'c2', aiConnectionId: 'claude-b', priority: 0 },
        { id: 'c3', aiConnectionId: 'codex-a', priority: 1 },
      ],
    },
  ],
  agentProfiles: [
    {
      id: 'solo-agent',
      workspaceId: 'personal',
      displayName: 'Solo agent',
      routePolicyId: 'solo-route',
    },
    {
      id: 'backed-agent',
      workspaceId: 'personal',
      displayName: 'Backed agent',
      routePolicyId: 'backed-route',
    },
  ],
} as unknown as ApplicationSettingsDto;

describe('aiAccountRemovalBlockers', () => {
  it('names the agents that would lose their last execution route', () => {
    // act
    const actual = aiAccountRemovalBlockers(settings, 'codex-a');

    // assert
    expect(actual).toEqual(['Solo agent']);
  });

  it('allows removing an account that every affected agent can route around', () => {
    // act
    const actual = aiAccountRemovalBlockers(settings, 'claude-b');

    // assert
    expect(actual).toEqual([]);
  });
});
