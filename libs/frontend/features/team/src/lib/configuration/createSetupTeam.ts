// #region Imports

import { defaultAgentAppearance } from '@symphony/domain-team';
import { skillFlowRoles } from '@symphony/domain-skills';
import { type IApplicationSettings } from '@symphony/configuration-composition';

// #endregion

/** One selected account can staff every phase; existing employees and custom workflows survive. @public */
export function createSetupTeam(
  settings: IApplicationSettings,
  workspaceId: string,
  connectionId: string,
  projectIdentity: string = workspaceId,
): { settings: IApplicationSettings; teamId: string } {
  const account = settings.connections.find(
    (item) =>
      item.id === connectionId &&
      item.workspaceId === workspaceId &&
      ['codex', 'claude', 'opencode'].includes(item.kind),
  );
  if (!account) throw new Error('Choose a CLI account in this workspace.');
  const runtime = account.kind as 'codex' | 'claude' | 'opencode';
  const root = `setup-${projectIdentity}`;
  const agentId = `${root}-employee`;
  const positionId = `${root}-position`;
  const routeId = `${root}-route`;
  const teamId = `${root}-team`;
  const existing = settings.agentProfiles.find((item) => item.id === agentId);
  const providerId = runtime;
  const capabilities = ['coding', 'reasoning', 'tool-calling'] as const;
  const replace = <T extends { id: string }>(entries: readonly T[], entry: T): T[] => [
    ...entries.filter((item) => item.id !== entry.id),
    entry,
  ];
  return {
    teamId,
    settings: {
      ...settings,
      positions: replace(settings.positions, {
        id: positionId,
        workspaceId,
        displayName: 'Generalist',
        description: 'Owns the phases of this project.',
        responsibilities: ['Analyse, implement and review the assigned tickets.'],
        allowedRoles: [...skillFlowRoles],
        authority: 'worktree-write',
        requiredCapabilities: [...capabilities],
        allowedPathPatterns: ['**'],
        forbiddenPathPatterns: ['.git/**', '.env', '.env.*', '**/credentials/**'],
        maximumChangedFiles: 100,
        maximumDiffLines: 20000,
        maximumIterations: 8,
      }),
      providerManifests: settings.providerManifests.some(
        (entry) => entry.workspaceId === workspaceId && entry.providerId === providerId,
      )
        ? settings.providerManifests
        : [
            ...settings.providerManifests,
            {
              id: `${root}-provider`,
              workspaceId,
              providerId,
              displayName: runtime,
              runtime,
              protocol: 'cli',
              capabilities: [...capabilities],
              modelDiscovery: 'runtime',
              officialApi: runtime !== 'opencode',
            },
          ],
      agentRoutePolicies: replace(settings.agentRoutePolicies, {
        id: routeId,
        workspaceId,
        displayName: `${account.displayName} route`,
        strategy: 'priority',
        costPolicy: 'any',
        sessionAffinity: true,
        maxParallelExecutions: 1,
        candidates: [
          {
            id: `${root}-candidate`,
            aiConnectionId: account.id,
            providerId,
            model: null,
            reasoningEffort: null,
            costClass: 'subscription-included',
            capabilities: [...capabilities],
            qualityScore: 90,
            contextWindow: null,
            priority: 0,
            enabled: true,
          },
        ],
      }),
      agentProfiles: replace(settings.agentProfiles, {
        id: agentId,
        workspaceId,
        displayName: existing?.displayName ?? 'Project employee',
        positionId,
        routePolicyId: routeId,
        qualificationTags: [],
        enabled: true,
        appearance: existing?.appearance ?? defaultAgentAppearance(agentId),
      }),
      agentTeams: replace(settings.agentTeams, {
        id: teamId,
        workspaceId,
        displayName: 'Project team',
        description: 'One employee starts the workflow; specialists can be added later.',
        assignments: skillFlowRoles.map((role) => ({
          role,
          primaryAgentId: agentId,
          fallbackAgentIds: [],
          skillId: null,
        })),
      }),
    },
  };
}
