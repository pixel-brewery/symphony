// #region Imports

import { describe, expect, it } from 'vitest';
import { applicationSettingsSchema } from './ApplicationSettingsSchema';
import { createDefaultApplicationSettings } from './createDefaultApplicationSettings';

// #endregion

describe('ApplicationSettingsSchema', () => {
  it('defaults missing Arcade visibility to disabled and accepts an explicit opt-in', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const { arcadeEnabled, ...legacyUser } = defaults.user;
    expect(arcadeEnabled).toBe(false);

    // act
    const legacy = applicationSettingsSchema.parse({ ...defaults, user: legacyUser });
    const optedIn = applicationSettingsSchema.parse({
      ...defaults,
      user: { ...defaults.user, arcadeEnabled: true },
    });

    // assert
    expect(legacy.user.arcadeEnabled).toBe(false);
    expect(optedIn.user.arcadeEnabled).toBe(true);
  });

  it('rejects a new multi-workspace active scope', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');

    // act
    const parse = (): unknown =>
      applicationSettingsSchema.parse({
        ...defaults,
        activeViewScope: {
          ...defaults.activeViewScope,
          workspaceIds: ['personal', 'customer'],
        },
      });

    // assert
    expect(parse).toThrow();
  });

  it('fails closed when a free-tier route lacks approved commercial-use evidence', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // act
    const freeRoute = {
      ...defaults.agentRoutePolicies[0]!,
      costPolicy: 'free-only' as const,
      candidates: defaults.agentRoutePolicies[0]!.candidates.map((candidate) => ({
        ...candidate,
        costClass: 'free-tier' as const,
      })),
    };

    // assert
    expect(() =>
      applicationSettingsSchema.parse({ ...defaults, agentRoutePolicies: [freeRoute] }),
    ).toThrow('operator-approved evidence');
    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        agentRoutePolicies: [
          {
            ...freeRoute,
            candidates: freeRoute.candidates.map((candidate) => ({
              ...candidate,
              freeTierEvidence: {
                source: 'https://provider.example/pricing',
                checkedAt: '2026-08-16T00:00:00.000Z',
                commercialUse: 'allowed' as const,
                operatorApproved: true,
              },
            })),
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects route capabilities that are not declared by its workspace provider manifest', () => {
    // act
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // assert
    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        providerManifests: defaults.providerManifests.map((manifest) => ({
          ...manifest,
          capabilities: ['coding'],
        })),
      }),
    ).toThrow('capabilities exceed');
  });

  it('rejects settings that are not in the current format', () => {
    // assert
    expect(() => applicationSettingsSchema.parse({ version: 1 })).toThrow();

    const current = createDefaultApplicationSettings('/Users/operator');
    expect(() =>
      applicationSettingsSchema.parse({
        ...current,
        runtime: { ...current.runtime, pollingIntervalSeconds: 900 },
      }),
    ).toThrow();
  });

  it('rejects incomplete current connection records instead of silently normalizing them', () => {
    // act
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // assert
    const withoutCredentialSources = {
      ...defaults,
      connections: [
        ...defaults.connections.map((connection) => {
          if (connection.kind !== 'codex') return connection;
          const { credentialSource, ...incompleteConnection } = connection;
          expect(credentialSource).toBe('isolated');
          return incompleteConnection;
        }),
      ],
    };

    expect(() => applicationSettingsSchema.parse(withoutCredentialSources)).toThrow();
  });

  it('accepts a workspace-owned OpenCode account and agent profile', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // act
    const settings = applicationSettingsSchema.parse({
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'personal-opencode',
          workspaceId: 'personal',
          kind: 'opencode',
          displayName: 'OpenCode account',
          credentialRef: 'env:OPENAI_API_KEY',
        },
      ],
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
      agentRoutePolicies: defaults.agentRoutePolicies.map((policy) => ({
        ...policy,
        candidates: policy.candidates.map((candidate) => ({
          ...candidate,
          aiConnectionId: 'personal-opencode',
          providerId: 'opencode',
          model: 'openai/gpt-5.6',
          reasoningEffort: 'high',
        })),
      })),
    });

    // assert
    expect(settings.connections).toContainEqual(
      expect.objectContaining({ id: 'personal-opencode', kind: 'opencode' }),
    );
  });

  it('rejects obsolete skill-flow roles instead of silently normalizing them', () => {
    // act
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // assert
    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        agentTeams: defaults.agentTeams.map((team) => ({
          ...team,
          assignments: [
            ...team.assignments,
            {
              role: 'issue-creation',
              primaryAgentId: defaults.agentProfiles[0]!.id,
              fallbackAgentIds: [],
              skillId: 'repository:create-change-request',
            },
          ],
        })),
      }),
    ).toThrow();
  });

  it('rejects cross-workspace references', () => {
    // act
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // assert
    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        repositoryBindings: [
          {
            id: 'foreign-repository',
            workspaceId: 'foreign',
            sourceControlConnectionId: 'missing',
            displayName: 'Foreign',
            provider: 'github',
            host: 'github.com',
            owner: 'example',
            name: 'foreign',
            defaultBranch: 'main',
            localPath: '',
            enabled: true,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects an enabled Teams intake without a Work Item Creator', () => {
    // act
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');

    // assert
    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        connections: [
          ...defaults.connections,
          {
            id: 'personal-github',
            workspaceId: 'personal',
            kind: 'github',
            displayName: 'Personal GitHub',
            hostname: 'github.com',
            gitProtocol: 'https',
          },
        ],
        workItemSources: [
          {
            id: 'personal-project',
            workspaceId: 'personal',
            connectionId: 'personal-github',
            provider: 'github-projects',
            displayName: 'Personal project',
            ownerType: 'organization',
            owner: 'example',
            projectNumber: 1,
            enabled: true,
          },
        ],
        repositoryBindings: [
          {
            id: 'personal-repository',
            workspaceId: 'personal',
            sourceControlConnectionId: 'personal-github',
            displayName: 'Personal repository',
            provider: 'github',
            host: 'github.com',
            owner: 'example',
            name: 'platform',
            defaultBranch: 'main',
            localPath: '',
            enabled: true,
          },
        ],
        feedbackIntakeSources: [
          {
            id: 'personal-teams-feedback',
            workspaceId: 'personal',
            displayName: 'Personal feedback',
            provider: 'microsoft-teams',
            tenantId: '00000000-0000-4000-8000-000000000001',
            clientId: '00000000-0000-4000-8000-000000000002',
            credentialRef: 'env:PERSONAL_TEAMS_SECRET',
            teamId: '00000000-0000-4000-8000-000000000003',
            channelId: '19:feedback@thread.tacv2',
            targetWorkItemSourceId: 'personal-project',
            targetRepositoryBindingId: 'personal-repository',
            enabled: true,
          },
        ],
      }),
    ).toThrow('Enable a Work Item Creator');
  });

  it('rejects ambiguous Azure DevOps queries and delivery contexts', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const azureConnection = {
      id: 'personal-azure',
      workspaceId: 'personal',
      kind: 'azure-devops' as const,
      displayName: 'Personal Azure DevOps',
      organization: 'example',
    };
    // act
    const ambiguousSource = {
      id: 'personal-work',
      workspaceId: 'personal',
      connectionId: azureConnection.id,
      provider: 'azure-devops' as const,
      displayName: 'Personal work',
      project: 'Platform',
      queryId: 'query-id',
      wiql: 'SELECT [System.Id] FROM WorkItems',
      enabled: true,
    };

    // assert
    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        connections: [...defaults.connections, azureConnection],
        workItemSources: [ambiguousSource],
      }),
    ).toThrow(/exactly one saved query ID or WIQL/u);

    expect(() =>
      applicationSettingsSchema.parse({
        ...defaults,
        deliveryContexts: [
          {
            id: 'context-a',
            workspaceId: 'personal',
            displayName: 'Context A',
            workItemSourceIds: [],
            repositoryBindingIds: [],
            ciBindingIds: [],
            agentTeamId: defaults.agentTeams[0]!.id,
            enabled: true,
          },
          {
            id: 'context-b',
            workspaceId: 'personal',
            displayName: 'Context B',
            workItemSourceIds: [],
            repositoryBindingIds: [],
            ciBindingIds: [],
            agentTeamId: defaults.agentTeams[0]!.id,
            enabled: true,
          },
        ],
      }),
    ).toThrow(/Only one enabled delivery context/u);
  });
  it('rejects a paid candidate in a free-only route instead of failing open', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp/symphony-free-only-test');

    // act
    const parse = () =>
      applicationSettingsSchema.parse({
        ...defaults,
        agentRoutePolicies: defaults.agentRoutePolicies.map((policy) => ({
          ...policy,
          costPolicy: 'free-only',
          candidates: policy.candidates.map((candidate) => ({
            ...candidate,
            costClass: 'paid',
          })),
        })),
      });

    // assert
    expect(parse).toThrow('A free-only route may contain only free-tier or local candidates.');
  });
});
