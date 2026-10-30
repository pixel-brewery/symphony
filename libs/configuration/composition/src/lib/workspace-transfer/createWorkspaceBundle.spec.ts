// #region Imports

import { describe, expect, it } from 'vitest';
import { applicationSettingsSchema } from '../application-settings/ApplicationSettingsSchema';
import { createWorkspaceBundle } from './createWorkspaceBundle';
import { WorkspaceTransferTestFixtures } from './WorkspaceTransferTestFixtures';

// #endregion

const { configuredWorkspace, fixedDate, sharedSkill } = WorkspaceTransferTestFixtures;

describe('createWorkspaceBundle', () => {
  it('exports complete portable configuration without secrets, account identity, or paths', () => {
    // arrange
    const source = configuredWorkspace();
    const bundle = createWorkspaceBundle(source, 'personal', [sharedSkill()], fixedDate());
    // act
    const serialized = JSON.stringify(bundle);

    // assert
    expect(bundle.connections).toContainEqual({
      id: 'personal-codex',
      workspaceId: 'personal',
      kind: 'codex',
      displayName: 'Default Codex account',
      credentialSource: 'isolated',
    });
    expect(bundle.connections).toContainEqual({
      id: 'platform-github',
      workspaceId: 'personal',
      kind: 'github',
      displayName: 'Platform GitHub',
      hostname: 'github.com',
      gitProtocol: 'https',
    });
    expect(bundle.repositoryBindings[0]).not.toHaveProperty('localPath');
    expect(bundle.providerManifests).toContainEqual(
      expect.objectContaining({ providerId: 'codex', runtime: 'codex' }),
    );
    expect(bundle.feedbackIntakeSources).toContainEqual(
      expect.objectContaining({ id: 'teams-feedback', enabled: false }),
    );
    expect(bundle.feedbackIntakeSources[0]).not.toHaveProperty('credentialRef');
    expect(bundle.skills).toEqual([
      expect.objectContaining({
        name: 'workspace-policy',
        instructions: 'Follow workspace policy.',
      }),
    ]);
    expect(serialized).not.toContain('credentialRef');
    expect(serialized).not.toContain('operator-login');
    expect(serialized).not.toContain('/source/platform');
    expect(serialized).not.toContain('/source/worktrees');
    expect(serialized).not.toContain('Operator');
  });

  it('exports an OpenCode account without its environment credential reference', () => {
    // arrange
    const source = configuredWorkspace();
    const openCodeConnection = {
      id: 'personal-opencode',
      workspaceId: 'personal',
      kind: 'opencode' as const,
      displayName: 'OpenCode account',
      credentialRef: 'env:OPENAI_API_KEY',
      gateway: {
        providerId: 'company-ai',
        displayName: 'Company AI Gateway',
        baseUrl: 'https://gateway.example/v1',
        protocol: 'openai-compatible' as const,
      },
    };
    const configured = applicationSettingsSchema.parse({
      ...source,
      connections: [...source.connections, openCodeConnection],
      providerManifests: [
        ...source.providerManifests.filter((manifest) => manifest.providerId !== 'codex'),
        {
          id: 'personal-company-ai-provider',
          workspaceId: 'personal',
          providerId: 'company-ai',
          displayName: 'Company AI Gateway',
          runtime: 'openai-compatible-gateway',
          protocol: 'openai-compatible',
          capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'],
          modelDiscovery: 'configured',
          officialApi: false,
        },
      ],
      agentRoutePolicies: source.agentRoutePolicies.map((policy) => ({
        ...policy,
        candidates: policy.candidates.map((candidate) => ({
          ...candidate,
          aiConnectionId: openCodeConnection.id,
          model: 'openai/gpt-5.6',
          reasoningEffort: 'high',
          providerId: 'company-ai',
        })),
      })),
    });

    const bundle = createWorkspaceBundle(configured, 'personal', [sharedSkill()], fixedDate());
    // act
    const serialized = JSON.stringify(bundle);

    // assert
    expect(bundle.connections).toContainEqual({
      id: 'personal-opencode',
      workspaceId: 'personal',
      kind: 'opencode',
      displayName: 'OpenCode account',
      gateway: openCodeConnection.gateway,
    });
    expect(serialized).not.toContain('credentialRef');
    expect(serialized).not.toContain('OPENAI_API_KEY');
  });
});
