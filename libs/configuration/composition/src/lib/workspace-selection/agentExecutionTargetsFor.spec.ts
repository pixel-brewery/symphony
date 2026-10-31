// #region Imports

import { describe, expect, it } from 'vitest';
import { agentExecutionTargetFor } from './agentExecutionTargetFor';
import { agentExecutionTargetsFor } from './agentExecutionTargetsFor';
import { applicationSettingsSchema } from '../application-settings/ApplicationSettingsSchema';
import { createDefaultApplicationSettings } from '../application-settings/createDefaultApplicationSettings';

// #endregion

describe('agentExecutionTargetsFor', () => {
  it('resolves different workspace-owned agents and accounts for analysis and solution', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp/symphony-agent-selection-test');
    const solverPosition = {
      id: 'personal-solver-position',
      workspaceId: 'personal',
      displayName: 'Implementation Engineer',
      description: 'Implements an approved contract.',
      responsibilities: ['Change only approved files in an isolated worktree.'],
      allowedRoles: ['solution'] as const,
      authority: 'worktree-write' as const,
    };
    // act
    const settings = applicationSettingsSchema.parse({
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'personal-opencode',
          workspaceId: 'personal',
          kind: 'opencode',
          displayName: 'Free implementation account',
        },
      ],
      positions: [...defaults.positions, solverPosition],
      providerManifests: [
        ...defaults.providerManifests,
        {
          id: 'personal-opencode-provider',
          workspaceId: 'personal',
          providerId: 'opencode',
          displayName: 'OpenCode',
          runtime: 'opencode',
          protocol: 'cli',
          capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'],
          modelDiscovery: 'configured',
          officialApi: true,
        },
      ],
      agentRoutePolicies: [
        ...defaults.agentRoutePolicies,
        {
          id: 'personal-free-route',
          workspaceId: 'personal',
          displayName: 'Free implementation route',
          strategy: 'priority',
          costPolicy: 'free-only',
          sessionAffinity: true,
          maxParallelExecutions: 1,
          candidates: [
            {
              id: 'personal-free-opencode',
              aiConnectionId: 'personal-opencode',
              model: 'free/coder',
              reasoningEffort: 'medium',
              costClass: 'free-tier',
              providerId: 'opencode',
              capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'],
              qualityScore: 50,
              contextWindow: null,
              freeTierEvidence: {
                source: 'https://provider.example/pricing',
                checkedAt: '2026-08-16T00:00:00.000Z',
                commercialUse: 'allowed',
                operatorApproved: true,
              },
              priority: 0,
              enabled: true,
            },
          ],
        },
      ],
      agentProfiles: [
        ...defaults.agentProfiles,
        {
          id: 'personal-solver',
          workspaceId: 'personal',
          displayName: 'Builder',
          positionId: solverPosition.id,
          routePolicyId: 'personal-free-route',
          qualificationTags: ['implementation'],
          enabled: true,
        },
      ],
      agentTeams: defaults.agentTeams.map((team) => ({
        ...team,
        assignments: team.assignments.map((assignment) =>
          assignment.role === 'solution'
            ? { ...assignment, primaryAgentId: 'personal-solver' }
            : assignment,
        ),
      })),
      deliveryContexts: [
        {
          id: 'personal-delivery',
          workspaceId: 'personal',
          displayName: 'Personal delivery',
          workItemSourceIds: [],
          repositoryBindingIds: [],
          ciBindingIds: [],
          agentTeamId: defaults.agentTeams[0]!.id,
          enabled: true,
        },
      ],
    });

    // assert
    expect(agentExecutionTargetFor(settings, 'analysis', 'personal')?.connection.kind).toBe(
      'codex',
    );
    expect(agentExecutionTargetFor(settings, 'solution', 'personal')).toMatchObject({
      agent: { id: 'personal-solver' },
      position: { id: solverPosition.id },
      routePolicy: { costPolicy: 'free-only' },
      routeCandidate: { model: 'free/coder', costClass: 'free-tier' },
      connection: { id: 'personal-opencode', kind: 'opencode' },
    });

    const withFallback = applicationSettingsSchema.parse({
      ...settings,
      agentTeams: settings.agentTeams.map((team) => ({
        ...team,
        assignments: team.assignments.map((assignment) =>
          assignment.role === 'solution'
            ? { ...assignment, fallbackAgentIds: [defaults.agentProfiles[0]!.id] }
            : assignment,
        ),
      })),
    });
    expect(
      agentExecutionTargetsFor(withFallback, 'solution', 'personal').map((target) => ({
        agent: target.agent.id,
        account: target.connection.id,
      })),
    ).toEqual([
      { agent: 'personal-solver', account: 'personal-opencode' },
      { agent: defaults.agentProfiles[0]!.id, account: defaults.connections[0]!.id },
    ]);
  });
});
