// #region Imports

import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import type { IApplicationSettings } from '../IApplicationSettings';
import { skillFlowRoles } from '@symphony/domain-skills';
import { applicationSettingsSchema } from './ApplicationSettingsSchema';

// #endregion

export function createDefaultApplicationSettings(homeDirectory = ''): IApplicationSettings {
  const baseDirectory = homeDirectory.replace(/\/$/u, '');
  const workspaceId = 'personal';
  const aiConnectionId = 'personal-codex';
  const positionId = 'personal-generalist-position';
  const routePolicyId = 'personal-default-route';
  const agentId = 'personal-default-agent';
  const teamId = 'personal-default-team';
  return applicationSettingsSchema.parse({
    version: 6,
    activeViewScope: { workspaceIds: [workspaceId], boardLayout: 'mixed' },
    workspaces: [
      {
        id: workspaceId,
        displayName: 'Personal',
        shortCode: 'P',
        color: '#4f6bed',
        enabled: true,
        isolation: 'strict',
        storageLimitGiB: 20,
      },
    ],
    connections: [
      {
        id: aiConnectionId,
        workspaceId,
        kind: 'codex',
        displayName: 'Default Codex account',
        credentialSource: 'isolated',
      },
    ],
    workItemSources: [],
    repositoryBindings: [],
    ciBindings: [],
    positions: [
      {
        id: positionId,
        workspaceId,
        displayName: 'Generalist',
        description: 'Owns the complete delivery flow until specialist positions are configured.',
        responsibilities: ['Plan, implement, verify, and review assigned work.'],
        allowedRoles: [...skillFlowRoles],
        authority: 'worktree-write',
        requiredCapabilities: ['coding', 'reasoning', 'tool-calling'],
        allowedPathPatterns: ['**'],
        forbiddenPathPatterns: ['.git/**', '.env', '.env.*', '**/credentials/**'],
        maximumChangedFiles: 100,
        maximumDiffLines: 20_000,
        maximumIterations: 8,
      },
    ],
    providerManifests: [
      {
        id: 'personal-codex-provider',
        workspaceId,
        providerId: 'codex',
        displayName: 'Codex',
        runtime: 'codex',
        protocol: 'cli',
        capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'],
        modelDiscovery: 'runtime',
        officialApi: true,
      },
    ],
    agentRoutePolicies: [
      {
        id: routePolicyId,
        workspaceId,
        displayName: 'Default quality route',
        strategy: 'priority',
        costPolicy: 'any',
        sessionAffinity: true,
        maxParallelExecutions: 1,
        candidates: [
          {
            id: 'personal-default-route-codex',
            aiConnectionId,
            model: null,
            reasoningEffort: null,
            costClass: 'subscription-included',
            providerId: 'codex',
            capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'],
            qualityScore: 90,
            contextWindow: null,
            priority: 0,
            enabled: true,
          },
        ],
      },
    ],
    agentProfiles: [
      {
        id: agentId,
        workspaceId,
        displayName: 'Default agent',
        positionId,
        routePolicyId,
        qualificationTags: [],
        enabled: true,
      },
    ],
    agentTeams: [
      {
        id: teamId,
        workspaceId,
        displayName: 'Default delivery team',
        description: 'Routes every delivery phase to the default agent.',
        assignments: skillFlowRoles.map((role) => ({
          role,
          primaryAgentId: agentId,
          fallbackAgentIds: [],
          skillId: null,
        })),
      },
    ],
    deliveryContexts: [],
    feedbackIntakeSources: [],
    savedViews: [],
    user: { displayName: 'Operator', email: '', theme: 'light', arcadeEnabled: false },
    localCi: {
      resourcePreset: 'balanced',
      storageLimitGiB: 32,
      reuseVirtualMachine: false,
    },
    runtime: {
      workspaceRoot: `${baseDirectory}/.symphony/workspaces`,
      managedStorageLimitGiB: 50,
      minimumFreeDiskGiB: 20,
      boardRefreshIntervalMinutes: 15,
      retainFailedWorkspaces: true,
      automaticExecutionEnabled: false,
      autonomousExecutionEnabled: false,
      autonomousWorkIntervalMinutes: 15,
      maxParallelExecutions: 3,
      maximumVerificationRepairAttempts: 2,
      agenticDelivery: { ...defaultAgenticDeliveryPolicy },
    },
  });
}
