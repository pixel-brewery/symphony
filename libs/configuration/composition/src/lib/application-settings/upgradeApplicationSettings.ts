// #region Imports

import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IApplicationSettings } from '../IApplicationSettings';
import { localCiResourceMinimums } from '@symphony/domain-ci';
import { skillFlowRoles } from '@symphony/domain-skills';
import { z } from 'zod';
import { applicationSettingsSchema } from './ApplicationSettingsSchema';
import { identifierSchema } from '@symphony/configuration-core';
import { legacySkillFlowAssignmentSchema } from './LegacySkillFlowAssignmentSchema';
import { providerConnectionSchema } from './ProviderConnectionSchema';
import { versionFourWorkspaceSchema } from './VersionFourWorkspaceSchema';
import { versionThreeSourceSchema } from './VersionThreeSourceSchema';
import { workflowStateStageIds } from './WorkflowStateStageIds';

// #endregion

/** Performs the one-time alpha cut from the former account-bound profile model. */
export function upgradeApplicationSettings(input: unknown): IApplicationSettings {
  if (typeof input !== 'object' || input === null) {
    return applicationSettingsSchema.parse(input);
  }
  const version = (input as { version?: unknown }).version;
  if (version === 4) {
    return applicationSettingsSchema.parse(
      normalizeActiveWorkspaceSelection(upgradeUnsafeLocalCiResources(upgradeVersionFour(input))),
    );
  }
  if (version === 3) {
    return applicationSettingsSchema.parse(
      normalizeActiveWorkspaceSelection(
        upgradeUnsafeLocalCiResources(upgradeVersionFour(upgradeVersionThree(input))),
      ),
    );
  }
  if (version !== 2) {
    return adoptShippedWorkflow(
      applicationSettingsSchema.parse(
        normalizeActiveWorkspaceSelection(upgradeUnsafeLocalCiResources(upgradeVersionFive(input))),
      ),
    );
  }
  // Version two is migrated to three below and then through the same version-three step, so
  // board column mappings are translated exactly once, by one implementation.
  const legacy = z
    .object({
      version: z.literal(2),
      connections: z.array(providerConnectionSchema),
      agentProfiles: z.array(legacyAgentProfileSchema),
      deliveryContexts: z.array(legacyDeliveryContextSchema),
    })
    .passthrough()
    .parse(input);
  const positions = legacy.agentProfiles.map((profile) => ({
    id: `${profile.id}-position`,
    workspaceId: profile.workspaceId,
    displayName: 'Generalist',
    description: `Migrated position for ${profile.displayName}.`,
    responsibilities: ['Own assigned delivery phases within the configured authority.'],
    allowedRoles: [...skillFlowRoles],
    authority: 'worktree-write' as const,
  }));
  const providerManifests = legacy.connections
    .flatMap((connection) => {
      if (
        connection.kind !== 'codex' &&
        connection.kind !== 'claude' &&
        connection.kind !== 'opencode'
      ) {
        return [];
      }
      return [
        {
          id: `${connection.workspaceId}-${connection.kind}-provider`,
          workspaceId: connection.workspaceId,
          providerId:
            connection.kind === 'opencode' && connection.gateway
              ? connection.gateway.providerId
              : connection.kind,
          displayName:
            connection.kind === 'codex'
              ? 'Codex'
              : connection.kind === 'claude'
                ? 'Claude Code'
                : (connection.gateway?.displayName ?? 'OpenCode'),
          runtime:
            connection.kind === 'opencode' && connection.gateway
              ? ('openai-compatible-gateway' as const)
              : connection.kind,
          protocol:
            connection.kind === 'opencode' && connection.gateway
              ? ('openai-compatible' as const)
              : ('cli' as const),
          capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'] as const,
          modelDiscovery:
            connection.kind === 'codex' || (connection.kind === 'opencode' && !connection.gateway)
              ? ('runtime' as const)
              : ('configured' as const),
          officialApi: !(connection.kind === 'opencode' && connection.gateway),
        },
      ];
    })
    .filter(
      (manifest, index, manifests) =>
        manifests.findIndex(
          (candidate) =>
            candidate.workspaceId === manifest.workspaceId &&
            candidate.providerId === manifest.providerId,
        ) === index,
    );
  const agentRoutePolicies = legacy.agentProfiles.map((profile) => {
    const connection = legacy.connections.find(
      (candidate) => candidate.id === profile.aiConnectionId,
    );
    return {
      id: `${profile.id}-route`,
      workspaceId: profile.workspaceId,
      displayName: `${profile.displayName} route`,
      strategy: 'priority' as const,
      costPolicy: 'any' as const,
      sessionAffinity: true,
      maxParallelExecutions: 1,
      candidates: [
        {
          id: `${profile.id}-primary-route`,
          aiConnectionId: profile.aiConnectionId,
          model: profile.model,
          reasoningEffort: profile.reasoningEffort,
          costClass:
            connection?.kind === 'codex' || connection?.kind === 'claude'
              ? ('subscription-included' as const)
              : ('unknown' as const),
          providerId:
            connection?.kind === 'opencode' && connection.gateway
              ? connection.gateway.providerId
              : (connection?.kind ?? 'provider-default'),
          capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'] as const,
          qualityScore: 50,
          contextWindow: null,
          priority: 0,
          enabled: true,
        },
      ],
    };
  });
  const agentProfiles = legacy.agentProfiles.map((profile) => ({
    id: profile.id,
    workspaceId: profile.workspaceId,
    displayName: profile.displayName,
    positionId: `${profile.id}-position`,
    routePolicyId: `${profile.id}-route`,
    qualificationTags: [],
    enabled: true,
  }));
  const contextsByWorkspace = new Set(
    legacy.deliveryContexts.map((context) => context.workspaceId),
  );
  const agentTeams = [
    ...legacy.deliveryContexts.map((deliveryContext) => {
      const profile = legacy.agentProfiles.find(
        (candidate) => candidate.id === deliveryContext.agentProfileId,
      );
      return {
        id: `${deliveryContext.id}-team`,
        workspaceId: deliveryContext.workspaceId,
        displayName: `${deliveryContext.displayName} team`,
        description: 'Migrated delivery team.',
        assignments: skillFlowRoles.map((role) => ({
          role,
          primaryAgentId: deliveryContext.agentProfileId,
          fallbackAgentIds: [],
          skillId:
            profile?.skillFlowAssignments.find((assignment) => assignment.role === role)?.skillId ??
            null,
        })),
      };
    }),
    ...legacy.agentProfiles
      .filter(
        (profile, index, profiles) =>
          !contextsByWorkspace.has(profile.workspaceId) &&
          profiles.findIndex((candidate) => candidate.workspaceId === profile.workspaceId) ===
            index,
      )
      .map((profile) => ({
        id: `${profile.workspaceId}-default-team`,
        workspaceId: profile.workspaceId,
        displayName: 'Default delivery team',
        description: 'Migrated delivery team.',
        assignments: skillFlowRoles.map((role) => ({
          role,
          primaryAgentId: profile.id,
          fallbackAgentIds: [],
          skillId:
            profile.skillFlowAssignments.find((assignment) => assignment.role === role)?.skillId ??
            null,
        })),
      })),
  ];
  return applicationSettingsSchema.parse(
    normalizeActiveWorkspaceSelection(
      upgradeUnsafeLocalCiResources(
        upgradeVersionFour(
          upgradeVersionThree({
            ...legacy,
            version: 3,
            positions,
            providerManifests,
            agentRoutePolicies,
            agentProfiles,
            agentTeams,
            deliveryContexts: legacy.deliveryContexts.map((deliveryContext) => {
              const { agentProfileId, ...context } = deliveryContext;
              void agentProfileId;
              return { ...context, agentTeamId: `${deliveryContext.id}-team` };
            }),
          }),
        ),
      ),
    ),
  );
}

/** Collapses the former multi-workspace view scope while preserving its selected board. */
function normalizeActiveWorkspaceSelection(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const settings = input as Record<string, unknown>;
  const activeViewScope = settings['activeViewScope'];
  if (typeof activeViewScope !== 'object' || activeViewScope === null) return input;
  const scope = activeViewScope as Record<string, unknown>;
  const workspaceIds = scope['workspaceIds'];
  if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) return input;
  if (!workspaceIds.every((workspaceId) => typeof workspaceId === 'string')) return input;
  const selectedWorkspaceIds = workspaceIds as string[];
  const workItemSources = Array.isArray(settings['workItemSources'])
    ? settings['workItemSources']
    : [];
  const activeSource = workItemSources.find(
    (source) =>
      typeof source === 'object' &&
      source !== null &&
      (source as Record<string, unknown>)['id'] === scope['workItemSourceId'],
  ) as Record<string, unknown> | undefined;
  const sourceWorkspaceId = activeSource?.['workspaceId'];
  const activeWorkspaceId =
    typeof sourceWorkspaceId === 'string' && selectedWorkspaceIds.includes(sourceWorkspaceId)
      ? sourceWorkspaceId
      : selectedWorkspaceIds[0];
  if (!activeWorkspaceId) return input;
  const workItemSourceId =
    activeSource === undefined || activeSource['workspaceId'] === activeWorkspaceId
      ? scope['workItemSourceId']
      : undefined;
  return {
    ...settings,
    activeViewScope: {
      ...scope,
      workspaceIds: [activeWorkspaceId],
      ...(workspaceIds.length > 1 ? { savedViewId: undefined } : {}),
      workItemSourceId,
    },
  };
}

const legacyAgentProfileSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  aiConnectionId: identifierSchema,
  activeSkillIds: z.array(identifierSchema),
  skillFlowAssignments: z.array(legacySkillFlowAssignmentSchema),
  model: identifierSchema.nullable(),
  reasoningEffort: identifierSchema.nullable(),
});

const legacyDeliveryContextSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  workItemSourceIds: z.array(identifierSchema),
  repositoryBindingIds: z.array(identifierSchema),
  ciBindingIds: z.array(identifierSchema),
  agentProfileId: identifierSchema,
  defaultRepositoryBindingId: identifierSchema.optional(),
  enabled: z.boolean(),
});

/** Migrates board column mappings onto the configurable stages of the shipped workflow. */
function upgradeVersionThree(input: unknown): unknown {
  const legacy = z
    .object({ version: z.literal(3), workItemSources: z.array(versionThreeSourceSchema) })
    .passthrough()
    .parse(input);
  return {
    ...legacy,
    version: 4,
    workflow: defaultWorkflow,
    skillCustomizations: [],
    workItemSources: legacy.workItemSources.map((source) => {
      if (!source.columnMappings) return source;
      const { columnMappings, ...rest } = source;
      return {
        ...rest,
        columnMappings: columnMappings.flatMap((mapping) => {
          const stageId = workflowStateStageIds[mapping.workflowState];
          return stageId ? [{ columnId: mapping.columnId, stageId }] : [];
        }),
      };
    }),
  };
}

/**
 * Moves the single host-wide local-runner switch onto every workspace.
 *
 * Local GitHub Actions belong to a workspace, so the decision to run them is made per workspace
 * while the machine specification stays host-owned. An installation that had local runs enabled
 * keeps them enabled everywhere it could already use them, which is exactly what the one switch
 * meant before.
 */
function upgradeVersionFour(input: unknown): unknown {
  const legacy = z
    .object({
      version: z.literal(4),
      workspaces: z.array(versionFourWorkspaceSchema),
      localCi: z.object({ enabled: z.boolean().optional() }).passthrough().optional(),
    })
    .passthrough()
    .parse(input);
  const { enabled, ...machineLocalCi } = legacy.localCi ?? {};
  return {
    ...legacy,
    version: 6,
    workspaces: legacy.workspaces.map((workspace) => ({
      ...workspace,
      localCiEnabled: workspace.localCiEnabled ?? enabled ?? false,
    })),
    ...(legacy.localCi ? { localCi: machineLocalCi } : {}),
  };
}

/** Keeps all v5 identities, custom workflows and runtime settings; profiles receive defaults. */
function upgradeVersionFive(input: unknown): unknown {
  const current = input as { readonly version?: unknown };
  return current.version === 5 ? { ...current, version: 6 } : input;
}

/** Repairs machine-local resource limits shipped before Local CI had a safe memory floor. */
function upgradeUnsafeLocalCiResources(input: unknown): unknown {
  const settings = input as {
    readonly localCi?: {
      readonly customResources?: {
        readonly memoryGiB?: unknown;
      };
    };
  };
  const resources = settings.localCi?.customResources;
  if (typeof resources?.memoryGiB !== 'number') return input;
  if (resources.memoryGiB >= localCiResourceMinimums.memoryGiB) return input;
  return {
    ...settings,
    localCi: {
      ...settings.localCi,
      customResources: {
        ...resources,
        memoryGiB: localCiResourceMinimums.memoryGiB,
      },
    },
  };
}

/**
 * Follows the shipped delivery process when it evolves.
 *
 * The workflow definition has no editor yet, so a stored workflow that still carries the
 * shipped id is the shipped process, only older: it once persisted guards the engine cannot
 * prove (such as `analysis-complete` before any role produces that artifact), which rejected
 * every automatic transition. A renamed definition is treated as deliberately customized and
 * is never touched.
 */
function adoptShippedWorkflow(settings: IApplicationSettings): IApplicationSettings {
  if (settings.workflow.id !== defaultWorkflow.id) return settings;
  if (settings.workflow.version >= defaultWorkflow.version) return settings;
  return { ...settings, workflow: defaultWorkflow };
}
