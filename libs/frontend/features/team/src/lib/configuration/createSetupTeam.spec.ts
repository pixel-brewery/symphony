// #region Imports

import { describe, expect, it } from 'vitest';
import {
  createDefaultApplicationSettings,
  applicationSettingsSchema,
} from '@symphony/configuration-composition';
import { createSetupTeam } from './createSetupTeam';

// #endregion

describe('createSetupTeam', () => {
  it('creates a complete valid team from one account without changing the draft source or workflow', () => {
    // arrange
    const settings = createDefaultApplicationSettings();
    const initial = JSON.stringify(settings);
    // act
    const proposal = createSetupTeam(settings, 'personal', 'personal-codex');
    // assert
    expect(() => applicationSettingsSchema.parse(proposal.settings)).not.toThrow();
    expect(JSON.stringify(settings)).toBe(initial);
    expect(proposal.settings.workflow).toBe(settings.workflow);
    const team = proposal.settings.agentTeams.find((entry) => entry.id === proposal.teamId)!;
    expect(new Set(team.assignments.map((assignment) => assignment.primaryAgentId)).size).toBe(1);
  });
  it('preserves an existing employee identity on a repeated proposal and a provider change', () => {
    // arrange
    const settings = createDefaultApplicationSettings();
    const first = createSetupTeam(settings, 'personal', 'personal-codex');
    const agent = first.settings.agentProfiles.at(-1)!;
    agent.appearance = { figure: 'kite', color: 'mint', accessories: ['badge'] };
    // act
    const changed = {
      ...first.settings,
      connections: [
        ...first.settings.connections,
        {
          id: 'another-cli',
          workspaceId: 'personal',
          kind: 'claude' as const,
          displayName: 'Claude',
          credentialSource: 'isolated' as const,
        },
      ],
    };
    const next = createSetupTeam(changed, 'personal', 'another-cli');
    // assert
    expect(next.settings.agentProfiles.find((entry) => entry.id === agent.id)?.appearance).toEqual(
      agent.appearance,
    );
    expect(next.settings.agentProfiles.length).toBe(first.settings.agentProfiles.length);
  });
});
