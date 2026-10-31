// #region Imports

import { describe, expect, it } from 'vitest';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { projectWorkspaceOrganization } from './';

// #endregion

describe('projectWorkspaceOrganization', () => {
  it('projects only the selected workspace and makes delegation plus provider order explicit', () => {
    // arrange
    const settings = {
      positions: [
        {
          id: 'architect',
          workspaceId: 'customer-a',
          displayName: 'Architect',
          description: 'Plans the change.',
          responsibilities: ['Own the approved implementation plan.'],
          allowedRoles: ['analysis'],
          authority: 'read-only',
        },
        {
          id: 'other-position',
          workspaceId: 'customer-b',
          displayName: 'Other workspace position',
          description: 'Must stay isolated.',
          responsibilities: [],
          allowedRoles: ['analysis'],
          authority: 'read-only',
        },
      ],
      agentRoutePolicies: [
        {
          id: 'analysis-route',
          workspaceId: 'customer-a',
          displayName: 'Analysis route',
          strategy: 'priority',
          costPolicy: 'free-only',
          sessionAffinity: true,
          maxParallelExecutions: 2,
          candidates: [
            {
              id: 'free-fallback',
              aiConnectionId: 'opencode-account',
              model: 'openai/gpt-free',
              reasoningEffort: 'high',
              costClass: 'free-tier',
              priority: 1,
              enabled: true,
            },
            {
              id: 'local-primary',
              aiConnectionId: 'local-account',
              model: 'ollama/qwen',
              reasoningEffort: null,
              costClass: 'local',
              priority: 0,
              enabled: true,
            },
          ],
        },
      ],
      agentProfiles: [
        {
          id: 'architect-agent',
          workspaceId: 'customer-a',
          displayName: 'Ada',
          appearance: { figure: 'dot', color: 'gold', accessories: [] },
          positionId: 'architect',
          routePolicyId: 'analysis-route',
          qualificationTags: ['architecture'],
          enabled: true,
        },
      ],
      agentTeams: [
        {
          id: 'delivery-team',
          workspaceId: 'customer-a',
          displayName: 'Delivery team',
          description: 'Owns delivery.',
          assignments: [
            {
              role: 'analysis',
              primaryAgentId: 'architect-agent',
              fallbackAgentIds: ['missing-agent'],
              skillId: 'analyze-change-request',
            },
          ],
        },
      ],
      connections: [
        {
          id: 'opencode-account',
          workspaceId: 'customer-a',
          kind: 'opencode',
          displayName: 'Free implementation account',
        },
        {
          id: 'local-account',
          workspaceId: 'customer-a',
          kind: 'opencode',
          displayName: 'Local model',
        },
        {
          id: 'other-account',
          workspaceId: 'customer-b',
          kind: 'claude',
          displayName: 'Other workspace account',
          credentialSource: 'isolated',
        },
      ],
    } as unknown as ApplicationSettingsDto;

    // act
    const organization = projectWorkspaceOrganization(settings, 'customer-a');

    // assert
    expect(organization.positions).toHaveLength(1);
    expect(organization.positions[0]).toMatchObject({
      authority: 'read-only',
      allowedRoles: ['analysis'],
      responsibilities: ['Own the approved implementation plan.'],
    });
    expect(organization.agents[0]).toMatchObject({
      displayName: 'Ada',
      appearance: { figure: 'dot', color: 'gold', accessories: [] },
      positionDisplayName: 'Architect',
      positionDescription: 'Plans the change.',
      enabled: true,
      accountId: 'local-account',
    });
    expect(organization.teams[0]?.assignments[0]).toMatchObject({
      primaryAgentDisplayName: 'Ada',
      skillId: 'analyze-change-request',
      fallbackAgentDisplayNames: ['Unavailable'],
    });
    expect(organization.routes[0]).toMatchObject({
      strategy: 'priority',
      costPolicy: 'free-only',
      sessionAffinity: true,
      maxParallelExecutions: 2,
    });
    expect(organization.routes[0]?.candidates.map((candidate) => candidate.displayName)).toEqual([
      'Local model',
      'Free implementation account',
    ]);
    expect(JSON.stringify(organization)).not.toContain('Other workspace');
  });

  it('orders agents by skill-flow responsibility, backups after primaries, unassigned last', () => {
    // arrange
    const position = {
      id: 'generalist',
      workspaceId: 'customer-a',
      displayName: 'Generalist',
      description: 'Does everything.',
      responsibilities: [],
      allowedRoles: ['analysis'],
      authority: 'read-only',
    };
    const agent = (id: string, displayName: string) => ({
      id,
      workspaceId: 'customer-a',
      displayName,
      positionId: 'generalist',
      routePolicyId: 'missing-route',
      qualificationTags: [],
      enabled: true,
    });
    const settings = {
      positions: [position],
      agentRoutePolicies: [],
      // Stored order is deliberately scrambled relative to the skill-flow order.
      agentProfiles: [
        agent('reviewer', 'Rita Review'),
        agent('unassigned', 'Udo Unassigned'),
        agent('repairer', 'Rick Repair'),
        agent('planner', 'Paul Planung'),
        agent('creator', 'Paula Planung'),
        agent('implementer', 'Immo Implementierung'),
        agent('plan-backup', 'Arno Architektur'),
      ],
      agentTeams: [
        {
          id: 'delivery-team',
          workspaceId: 'customer-a',
          displayName: 'Delivery team',
          description: 'Owns delivery.',
          assignments: [
            {
              role: 'pull-request-review',
              primaryAgentId: 'reviewer',
              fallbackAgentIds: [],
              skillId: null,
            },
            {
              role: 'analysis',
              primaryAgentId: 'planner',
              fallbackAgentIds: ['plan-backup'],
              skillId: null,
            },
            { role: 'ci-repair', primaryAgentId: 'repairer', fallbackAgentIds: [], skillId: null },
            {
              role: 'work-item-creation',
              primaryAgentId: 'creator',
              fallbackAgentIds: [],
              skillId: null,
            },
            {
              role: 'solution',
              primaryAgentId: 'implementer',
              fallbackAgentIds: [],
              skillId: null,
            },
          ],
        },
      ],
      connections: [],
    } as unknown as ApplicationSettingsDto;

    const organization = projectWorkspaceOrganization(settings, 'customer-a');

    // act
    const actual = organization.agents.map((item) => item.displayName);

    // assert
    expect(actual).toEqual([
      'Paula Planung',
      'Paul Planung',
      'Arno Architektur',
      'Immo Implementierung',
      'Rick Repair',
      'Rita Review',
      'Udo Unassigned',
    ]);
  });
});
