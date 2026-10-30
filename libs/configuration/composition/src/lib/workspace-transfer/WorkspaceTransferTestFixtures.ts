// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { ISkillPackageDocument } from '@symphony/domain-skills';
import { applicationSettingsSchema } from '../application-settings/ApplicationSettingsSchema';
import { createDefaultApplicationSettings } from '../application-settings/createDefaultApplicationSettings';

// #endregion

function configuredWorkspace(): IApplicationSettings {
  const defaults = createDefaultApplicationSettings('/source');
  return applicationSettingsSchema.parse({
    ...defaults,
    connections: [
      {
        ...defaults.connections[0],
        credentialRef: 'env:CODEX_API_KEY',
      },
      {
        id: 'platform-github',
        workspaceId: 'personal',
        kind: 'github',
        displayName: 'Platform GitHub',
        hostname: 'github.com',
        accountLogin: 'operator-login',
        gitProtocol: 'https',
        credentialRef: 'secret:github-token',
      },
    ],
    workItemSources: [
      {
        id: 'platform-project',
        workspaceId: 'personal',
        connectionId: 'platform-github',
        provider: 'github-projects',
        displayName: 'Platform board',
        ownerType: 'organization',
        owner: 'example',
        projectNumber: 1,
        enabled: true,
      },
    ],
    repositoryBindings: [
      {
        id: 'platform-repository',
        workspaceId: 'personal',
        sourceControlConnectionId: 'platform-github',
        displayName: 'Platform',
        provider: 'github',
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath: '/source/platform',
        enabled: true,
      },
    ],
    ciBindings: [
      {
        id: 'platform-ci',
        workspaceId: 'personal',
        repositoryBindingId: 'platform-repository',
        sourceControlConnectionId: 'platform-github',
        provider: 'github-actions',
        displayName: 'Platform CI',
        enabled: true,
      },
    ],
    feedbackIntakeSources: [
      {
        id: 'teams-feedback',
        workspaceId: 'personal',
        displayName: 'FLAMOX365 feedback',
        provider: 'microsoft-teams',
        tenantId: '00000000-0000-4000-8000-000000000001',
        clientId: '00000000-0000-4000-8000-000000000002',
        credentialRef: 'env:TEAMS_FEEDBACK_CLIENT_SECRET',
        teamId: '00000000-0000-4000-8000-000000000003',
        channelId: '19:feedback@thread.tacv2',
        targetWorkItemSourceId: 'platform-project',
        targetRepositoryBindingId: 'platform-repository',
        enabled: true,
      },
    ],
    agentRoutePolicies: defaults.agentRoutePolicies.map((policy) => ({
      ...policy,
      candidates: policy.candidates.map((candidate) => ({
        ...candidate,
        model: 'gpt-5.6-sol',
        reasoningEffort: 'high',
      })),
    })),
    agentTeams: defaults.agentTeams.map((team) => ({
      ...team,
      assignments: team.assignments.map((assignment) =>
        assignment.role === 'analysis'
          ? { ...assignment, skillId: 'user:workspace-policy' }
          : assignment.role === 'work-item-creation'
            ? { ...assignment, skillId: 'repository:create-change-request' }
            : assignment,
      ),
    })),
    deliveryContexts: [
      {
        id: 'platform-delivery',
        workspaceId: 'personal',
        displayName: 'Platform delivery',
        workItemSourceIds: ['platform-project'],
        repositoryBindingIds: ['platform-repository'],
        ciBindingIds: ['platform-ci'],
        agentTeamId: 'personal-default-team',
        defaultRepositoryBindingId: 'platform-repository',
        enabled: true,
      },
    ],
    user: { displayName: 'Operator', email: '', theme: 'light', arcadeEnabled: false },
    runtime: { ...defaults.runtime, workspaceRoot: '/source/worktrees' },
  });
}

function sharedSkill(): ISkillPackageDocument {
  return {
    id: 'user:workspace-policy',
    name: 'workspace-policy',
    displayName: 'Workspace policy',
    description: 'Workspace-specific implementation policy.',
    source: 'user',
    location: '/source/.agents/skills/workspace-policy',
    editable: true,
    implicitInvocation: false,
    updatedAt: fixedDate().toISOString(),
    digest: 'source-digest',
    resourceCount: 1,
    warnings: [],
    instructions: 'Follow workspace policy.',
    openaiYaml: '',
    files: [
      {
        path: 'references/policy.md',
        kind: 'reference',
        encoding: 'utf8',
        content: 'Policy reference.',
        size: 17,
      },
    ],
  };
}

function fixedDate(): Date {
  return new Date('2026-08-13T10:11:12.000Z');
}

export const WorkspaceTransferTestFixtures = {
  configuredWorkspace,
  fixedDate,
  sharedSkill,
};
