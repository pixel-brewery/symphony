// #region Imports

import { describe, expect, it } from 'vitest';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { withoutAiAccount } from './';

// #endregion

const settings = {
  connections: [
    { id: 'codex-a', workspaceId: 'personal', kind: 'codex', displayName: 'Codex A' },
    { id: 'claude-b', workspaceId: 'personal', kind: 'claude', displayName: 'Claude B' },
  ],
  agentRoutePolicies: [
    {
      id: 'solo-route',
      candidates: [{ id: 'c1', aiConnectionId: 'codex-a', priority: 0 }],
    },
    {
      id: 'backed-route',
      candidates: [
        { id: 'c2', aiConnectionId: 'claude-b', priority: 0 },
        { id: 'c3', aiConnectionId: 'codex-a', priority: 1 },
      ],
    },
  ],
} as unknown as ApplicationSettingsDto;

describe('withoutAiAccount', () => {
  it('drops the connection, its route candidates, and renumbers the remaining priorities', () => {
    // arrange
    const next = withoutAiAccount(settings, 'claude-b');

    // act
    const actual = next.connections.map((connection) => connection.id);

    // assert
    expect(actual).toEqual(['codex-a']);
    expect(next.agentRoutePolicies.map((policy) => policy.candidates)).toEqual([
      [{ id: 'c1', aiConnectionId: 'codex-a', priority: 0 }],
      [{ id: 'c3', aiConnectionId: 'codex-a', priority: 0 }],
    ]);
  });
});
