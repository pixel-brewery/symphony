// #region Imports

import { describe, expect, it } from 'vitest';
import { applicationSettingsSchema } from './application-settings/ApplicationSettingsSchema';
import { createDefaultApplicationSettings } from './application-settings/createDefaultApplicationSettings';
import { removeWorkspaceConfiguration } from './removeWorkspaceConfiguration';

// #endregion

describe('removeWorkspaceConfiguration', () => {
  it('removes a workspace and every configuration record owned by it', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const customerWorkspace = {
      id: 'customer',
      displayName: 'Customer',
      shortCode: 'CU',
      color: '#008272',
      enabled: true,
      isolation: 'strict' as const,
    };
    const settings = applicationSettingsSchema.parse({
      ...defaults,
      workspaces: [...defaults.workspaces, customerWorkspace],
      activeViewScope: {
        workspaceIds: ['customer'],
        savedViewId: 'all-workspaces',
        boardLayout: 'mixed',
        workItemSourceId: 'customer-project',
      },
      connections: [
        ...defaults.connections,
        {
          id: 'customer-github',
          workspaceId: 'customer',
          kind: 'github',
          displayName: 'Customer GitHub',
          hostname: 'github.com',
          gitProtocol: 'https',
        },
        {
          id: 'customer-codex',
          workspaceId: 'customer',
          kind: 'codex',
          displayName: 'Customer Codex',
          credentialSource: 'isolated',
        },
      ],
      workItemSources: [
        {
          id: 'customer-project',
          workspaceId: 'customer',
          connectionId: 'customer-github',
          provider: 'github-projects',
          displayName: 'Customer project',
          ownerType: 'organization',
          owner: 'example',
          projectNumber: 3,
          enabled: true,
        },
      ],
      feedbackIntakeSources: [
        {
          id: 'customer-teams-feedback',
          workspaceId: 'customer',
          displayName: 'Customer feedback',
          provider: 'microsoft-teams',
          tenantId: '00000000-0000-4000-8000-000000000001',
          clientId: '00000000-0000-4000-8000-000000000002',
          credentialRef: 'env:CUSTOMER_TEAMS_SECRET',
          teamId: '00000000-0000-4000-8000-000000000003',
          channelId: '19:feedback@thread.tacv2',
          targetWorkItemSourceId: 'customer-project',
          targetRepositoryBindingId: 'customer-repository',
          enabled: true,
        },
      ],
      repositoryBindings: [
        {
          id: 'customer-repository',
          workspaceId: 'customer',
          sourceControlConnectionId: 'customer-github',
          displayName: 'Customer repository',
          provider: 'github',
          host: 'github.com',
          owner: 'example',
          name: 'customer',
          defaultBranch: 'main',
          localPath: '/src/customer',
          enabled: true,
        },
      ],
      deliveryTargets: [
        {
          id: 'customer-production',
          workspaceId: 'customer',
          repositoryBindingId: 'customer-repository',
          displayName: 'Customer Production',
          kind: 'environment',
          environment: 'production',
          production: true,
        },
      ],
      ciBindings: [
        {
          id: 'customer-ci',
          workspaceId: 'customer',
          repositoryBindingId: 'customer-repository',
          sourceControlConnectionId: 'customer-github',
          provider: 'github-actions',
          displayName: 'Customer CI',
          enabled: true,
        },
      ],
      positions: [
        ...defaults.positions,
        {
          id: 'customer-generalist',
          workspaceId: 'customer',
          displayName: 'Generalist',
          description: 'Customer delivery owner.',
          responsibilities: ['Create and deliver work items.'],
          allowedRoles: ['work-item-creation'],
          authority: 'worktree-write',
        },
      ],
      agentRoutePolicies: [
        ...defaults.agentRoutePolicies,
        {
          id: 'customer-route',
          workspaceId: 'customer',
          displayName: 'Customer route',
          strategy: 'priority',
          costPolicy: 'any',
          sessionAffinity: true,
          maxParallelExecutions: 1,
          candidates: [
            {
              id: 'customer-codex-route',
              aiConnectionId: 'customer-codex',
              model: null,
              reasoningEffort: null,
              costClass: 'subscription-included',
              priority: 0,
              enabled: true,
            },
          ],
        },
      ],
      agentProfiles: [
        ...defaults.agentProfiles,
        {
          id: 'customer-agent',
          workspaceId: 'customer',
          displayName: 'Customer agent',
          positionId: 'customer-generalist',
          routePolicyId: 'customer-route',
          qualificationTags: [],
          enabled: true,
        },
      ],
      agentTeams: [
        ...defaults.agentTeams,
        {
          id: 'customer-team',
          workspaceId: 'customer',
          displayName: 'Customer team',
          description: 'Customer delivery team.',
          assignments: [
            {
              role: 'work-item-creation',
              primaryAgentId: 'customer-agent',
              fallbackAgentIds: [],
              skillId: 'repository:create-change-request',
            },
          ],
        },
      ],
      deliveryContexts: [
        ...defaults.deliveryContexts,
        {
          id: 'customer-delivery',
          workspaceId: 'customer',
          displayName: 'Customer delivery',
          workItemSourceIds: ['customer-project'],
          repositoryBindingIds: ['customer-repository'],
          ciBindingIds: ['customer-ci'],
          agentTeamId: 'customer-team',
          defaultRepositoryBindingId: 'customer-repository',
          enabled: true,
        },
      ],
      savedViews: [
        {
          id: 'all-workspaces',
          displayName: 'All workspaces',
          workspaceIds: ['personal', 'customer'],
          boardLayout: 'mixed',
        },
        {
          id: 'customer-only',
          displayName: 'Customer only',
          workspaceIds: ['customer'],
          boardLayout: 'grouped',
        },
      ],
    });

    const removed = removeWorkspaceConfiguration(settings, 'customer');

    // act
    const actual = removed.workspaces.map((workspace) => workspace.id);

    // assert
    expect(actual).toEqual(['personal']);
    expect(removed.feedbackIntakeSources).toEqual([]);
    expect(removed.deliveryTargets).toEqual([]);
    expect(settings.deliveryTargets).toHaveLength(1);
    expect(removed.providerManifests.every((manifest) => manifest.workspaceId !== 'customer')).toBe(
      true,
    );
    expect(removed.activeViewScope).toMatchObject({
      workspaceIds: ['personal'],
      savedViewId: 'all-workspaces',
    });
    // The removed workspace owned the selected board, so the board selection is cleared.
    expect(removed.activeViewScope.workItemSourceId).toBeUndefined();
    expect(removed.savedViews).toEqual([
      expect.objectContaining({ id: 'all-workspaces', workspaceIds: ['personal'] }),
    ]);
    for (const records of [
      removed.connections,
      removed.workItemSources,
      removed.repositoryBindings,
      removed.ciBindings,
      removed.agentProfiles,
      removed.deliveryContexts,
    ]) {
      expect(records.every((record) => record.workspaceId !== 'customer')).toBe(true);
    }
  });

  it('does not remove the last workspace', () => {
    // assert
    expect(() =>
      removeWorkspaceConfiguration(createDefaultApplicationSettings('/Users/operator'), 'personal'),
    ).toThrow('last workspace');
  });
});
