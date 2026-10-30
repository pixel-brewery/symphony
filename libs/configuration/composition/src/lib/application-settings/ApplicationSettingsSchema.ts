// #region Imports

import { z } from 'zod';
import { skillCustomizationSchema } from '@symphony/configuration-skills';
import { workflowDefinitionSchema } from '@symphony/configuration-workflow';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { localCiResourcePresetNames } from '@symphony/domain-ci';
import { deliveryTargetSchema } from '@symphony/configuration-delivery';
import { agentProfileSchema } from '@symphony/configuration-team';
import { agentRoutePolicySchema } from '@symphony/configuration-ai';
import { agentTeamSchema } from '@symphony/configuration-team';
import { agenticDeliveryPolicySchema } from '@symphony/configuration-automation';
import { ciBindingSchema } from '@symphony/configuration-ci';
import { deliveryContextSchema } from '@symphony/configuration-workspace';
import { feedbackIntakeSourceSchema } from '@symphony/configuration-feedback';
import { identifierSchema } from '@symphony/configuration-core';
import { localCiResourceLimitsSchema } from '@symphony/configuration-ci';
import { positionDefinitionSchema } from '@symphony/configuration-team';
import { providerCapabilityManifestSchema } from '@symphony/configuration-ai';
import { providerConnectionSchema } from './ProviderConnectionSchema';
import { repositoryBindingSchema } from '@symphony/configuration-workspace';
import { workItemSourceSchema } from '@symphony/configuration-work';
import { workspaceSchema } from '@symphony/configuration-workspace';
const runtimeSettingsSchema = z
  .object({
    workspaceRoot: identifierSchema,
    managedStorageLimitGiB: z.number().int().min(5).max(2_048).default(50),
    minimumFreeDiskGiB: z.number().int().min(5).max(512).default(20),
    boardRefreshIntervalMinutes: z.number().int().min(1).max(1_440).default(15),
    retainFailedWorkspaces: z.boolean(),
    automaticExecutionEnabled: z.boolean().default(false),
    autonomousExecutionEnabled: z.boolean().default(false),
    autonomousWorkIntervalMinutes: z.number().int().min(1).max(1_440).default(15),
    maxParallelExecutions: z.number().int().min(1).max(32).default(3),
    maximumVerificationRepairAttempts: z.number().int().min(0).max(10).default(2),
    agenticDelivery: agenticDeliveryPolicySchema,
  })
  .strict();

const savedViewSchema = z.object({
  id: identifierSchema,
  displayName: identifierSchema,
  workspaceIds: z.array(identifierSchema).min(1),
  boardLayout: z.enum(['mixed', 'grouped']),
});

/** Host-owned virtual-machine specification. Which workspace may use it is decided per workspace. */
const localCiSettingsSchema = z
  .object({
    resourcePreset: z.enum(localCiResourcePresetNames),
    customResources: localCiResourceLimitsSchema.optional(),
    storageLimitGiB: z.number().int().min(8).max(256).default(32),
    reuseVirtualMachine: z.boolean().default(false),
  })
  .superRefine((settings, context) => {
    if (settings.resourcePreset === 'custom' && !settings.customResources) {
      context.addIssue({
        code: 'custom',
        path: ['customResources'],
        message: 'Custom Local CI resources are required when the Custom preset is selected.',
      });
    }
  })
  .default({
    resourcePreset: 'balanced',
    storageLimitGiB: 32,
    reuseVirtualMachine: false,
  });

// #endregion

export const applicationSettingsSchema = z
  .object({
    version: z.literal(6),
    workflow: workflowDefinitionSchema.default(defaultWorkflow),
    skillCustomizations: z.array(skillCustomizationSchema).default([]),
    activeViewScope: z.object({
      workspaceIds: z.array(identifierSchema).length(1),
      savedViewId: identifierSchema.optional(),
      boardLayout: z.enum(['mixed', 'grouped']),
      workItemSourceId: identifierSchema.optional(),
    }),
    workspaces: z.array(workspaceSchema).min(1),
    connections: z.array(providerConnectionSchema),
    workItemSources: z.array(workItemSourceSchema),
    repositoryBindings: z.array(repositoryBindingSchema),
    ciBindings: z.array(ciBindingSchema),
    positions: z.array(positionDefinitionSchema),
    providerManifests: z.array(providerCapabilityManifestSchema).default([]),
    agentRoutePolicies: z.array(agentRoutePolicySchema),
    agentProfiles: z.array(agentProfileSchema),
    agentTeams: z.array(agentTeamSchema),
    deliveryContexts: z.array(deliveryContextSchema),
    deliveryTargets: z.array(deliveryTargetSchema).max(100).default([]),
    feedbackIntakeSources: z.array(feedbackIntakeSourceSchema).default([]),
    savedViews: z.array(savedViewSchema),
    user: z.object({
      displayName: identifierSchema,
      email: z.union([z.literal(''), z.email()]),
      theme: z.enum(['light', 'dark', 'system']),
      arcadeEnabled: z.boolean().default(false),
    }),
    localCi: localCiSettingsSchema,
    runtime: runtimeSettingsSchema,
  })
  .strict()
  .superRefine((settings, context) => {
    const workspaceIds = new Set(settings.workspaces.map((workspace) => workspace.id));
    const workspacesById = new Map(
      settings.workspaces.map((workspace) => [workspace.id, workspace]),
    );
    const connectionIds = new Set(settings.connections.map((connection) => connection.id));
    const connectionsById = new Map(
      settings.connections.map((connection) => [connection.id, connection]),
    );
    const repositoryIds = new Set(settings.repositoryBindings.map((repository) => repository.id));
    const repositoriesById = new Map(
      settings.repositoryBindings.map((repository) => [repository.id, repository]),
    );
    const sourceIds = new Set(settings.workItemSources.map((source) => source.id));
    const sourcesById = new Map(settings.workItemSources.map((source) => [source.id, source]));
    const ciIds = new Set(settings.ciBindings.map((binding) => binding.id));
    const ciById = new Map(settings.ciBindings.map((binding) => [binding.id, binding]));
    const positionsById = new Map(settings.positions.map((position) => [position.id, position]));
    settings.providerManifests.forEach((manifest, index) => {
      if (!workspaceIds.has(manifest.workspaceId)) {
        context.addIssue({
          code: 'custom',
          path: ['providerManifests', index, 'workspaceId'],
          message: `Unknown workspace: ${manifest.workspaceId}`,
        });
      }
    });
    const routePoliciesById = new Map(
      settings.agentRoutePolicies.map((policy) => [policy.id, policy]),
    );
    const profilesById = new Map(settings.agentProfiles.map((profile) => [profile.id, profile]));
    const teamIds = new Set(settings.agentTeams.map((team) => team.id));
    const teamsById = new Map(settings.agentTeams.map((team) => [team.id, team]));

    const assertUniqueIds = (items: readonly { id: string }[], path: string): void => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.id))
          context.addIssue({
            code: 'custom',
            path: [path, index, 'id'],
            message: `Duplicate ID: ${item.id}`,
          });
        seen.add(item.id);
      });
    };

    assertUniqueIds(settings.feedbackIntakeSources, 'feedbackIntakeSources');
    settings.feedbackIntakeSources.forEach((source, index) => {
      if (!workspaceIds.has(source.workspaceId)) {
        context.addIssue({
          code: 'custom',
          path: ['feedbackIntakeSources', index, 'workspaceId'],
          message: `Unknown workspace: ${source.workspaceId}`,
        });
      }
      const targetSource = sourcesById.get(source.targetWorkItemSourceId);
      if (
        !targetSource ||
        targetSource.workspaceId !== source.workspaceId ||
        targetSource.provider !== 'github-projects' ||
        !targetSource.enabled
      ) {
        context.addIssue({
          code: 'custom',
          path: ['feedbackIntakeSources', index, 'targetWorkItemSourceId'],
          message: 'Teams feedback intake requires a GitHub Project source in the same workspace.',
        });
      }
      const targetRepository = repositoriesById.get(source.targetRepositoryBindingId);
      if (
        !targetRepository ||
        targetRepository.workspaceId !== source.workspaceId ||
        targetRepository.provider !== 'github' ||
        !targetRepository.enabled
      ) {
        context.addIssue({
          code: 'custom',
          path: ['feedbackIntakeSources', index, 'targetRepositoryBindingId'],
          message: 'Teams feedback intake requires a GitHub repository in the same workspace.',
        });
      }
      if (source.enabled && !source.credentialRef) {
        context.addIssue({
          code: 'custom',
          path: ['feedbackIntakeSources', index, 'credentialRef'],
          message: 'An enabled Teams feedback intake requires a credential reference.',
        });
      }
      if (source.enabled) {
        const hasWorkItemCreator = settings.deliveryContexts.some((deliveryContext) => {
          if (!deliveryContext.enabled || deliveryContext.workspaceId !== source.workspaceId) {
            return false;
          }
          return teamsById
            .get(deliveryContext.agentTeamId)
            ?.assignments.some(
              (assignment) =>
                assignment.role === 'work-item-creation' && assignment.skillId !== null,
            );
        });
        if (!hasWorkItemCreator) {
          context.addIssue({
            code: 'custom',
            path: ['feedbackIntakeSources', index, 'enabled'],
            message: 'Enable a Work Item Creator in this workspace before activating intake.',
          });
        }
      }
    });
    assertUniqueIds(settings.workspaces, 'workspaces');
    assertUniqueIds(settings.connections, 'connections');
    assertUniqueIds(settings.workItemSources, 'workItemSources');
    assertUniqueIds(settings.repositoryBindings, 'repositoryBindings');
    assertUniqueIds(settings.ciBindings, 'ciBindings');
    assertUniqueIds(settings.positions, 'positions');
    assertUniqueIds(settings.providerManifests, 'providerManifests');
    const providerManifestKeys = new Set<string>();
    settings.providerManifests.forEach((manifest, index) => {
      const key = `${manifest.workspaceId}\u0000${manifest.providerId}`;
      if (providerManifestKeys.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['providerManifests', index, 'providerId'],
          message: `Duplicate workspace provider manifest: ${manifest.providerId}`,
        });
      }
      providerManifestKeys.add(key);
    });
    assertUniqueIds(settings.agentRoutePolicies, 'agentRoutePolicies');
    assertUniqueIds(settings.agentProfiles, 'agentProfiles');
    assertUniqueIds(settings.agentTeams, 'agentTeams');
    assertUniqueIds(settings.deliveryContexts, 'deliveryContexts');
    assertUniqueIds(settings.savedViews, 'savedViews');

    const assertWorkspace = (workspaceId: string, path: (string | number)[]): void => {
      if (!workspaceIds.has(workspaceId)) {
        context.addIssue({ code: 'custom', path, message: `Unknown workspace: ${workspaceId}` });
      }
    };
    settings.activeViewScope.workspaceIds.forEach((workspaceId, index) =>
      assertWorkspace(workspaceId, ['activeViewScope', 'workspaceIds', index]),
    );
    settings.activeViewScope.workspaceIds.forEach((workspaceId, index) => {
      if (workspacesById.get(workspaceId)?.enabled === false) {
        context.addIssue({
          code: 'custom',
          path: ['activeViewScope', 'workspaceIds', index],
          message: `Disabled workspace cannot be selected: ${workspaceId}`,
        });
      }
    });
    if (
      settings.activeViewScope.workItemSourceId &&
      !settings.workItemSources.some(
        (source) => source.id === settings.activeViewScope.workItemSourceId,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['activeViewScope', 'workItemSourceId'],
        message: `Unknown work-item source: ${settings.activeViewScope.workItemSourceId}`,
      });
    }
    const activeWorkItemSource = settings.workItemSources.find(
      (source) => source.id === settings.activeViewScope.workItemSourceId,
    );
    if (
      activeWorkItemSource &&
      activeWorkItemSource.workspaceId !== settings.activeViewScope.workspaceIds[0]
    ) {
      context.addIssue({
        code: 'custom',
        path: ['activeViewScope', 'workItemSourceId'],
        message: 'The active work-item source must belong to the active workspace.',
      });
    }
    if (
      settings.activeViewScope.savedViewId &&
      !settings.savedViews.some((view) => view.id === settings.activeViewScope.savedViewId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['activeViewScope', 'savedViewId'],
        message: `Unknown saved view: ${settings.activeViewScope.savedViewId}`,
      });
    }
    settings.connections.forEach((connection, index) =>
      assertWorkspace(connection.workspaceId, ['connections', index, 'workspaceId']),
    );
    settings.workItemSources.forEach((source, index) => {
      assertWorkspace(source.workspaceId, ['workItemSources', index, 'workspaceId']);
      if (!connectionIds.has(source.connectionId)) {
        context.addIssue({
          code: 'custom',
          path: ['workItemSources', index, 'connectionId'],
          message: `Unknown provider connection: ${source.connectionId}`,
        });
      }
      const connection = connectionsById.get(source.connectionId);
      if (
        connection &&
        (connection.workspaceId !== source.workspaceId ||
          (source.provider === 'azure-devops' && connection.kind !== 'azure-devops') ||
          (source.provider === 'github-projects' && connection.kind !== 'github'))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['workItemSources', index, 'connectionId'],
          message: 'Work-item source connection crosses a workspace or provider boundary.',
        });
      }
      if (source.provider === 'azure-devops' && Boolean(source.queryId) === Boolean(source.wiql)) {
        context.addIssue({
          code: 'custom',
          path: ['workItemSources', index],
          message: 'Azure DevOps sources require exactly one saved query ID or WIQL.',
        });
      }
    });
    settings.repositoryBindings.forEach((repository, index) => {
      assertWorkspace(repository.workspaceId, ['repositoryBindings', index, 'workspaceId']);
      if (!connectionIds.has(repository.sourceControlConnectionId)) {
        context.addIssue({
          code: 'custom',
          path: ['repositoryBindings', index, 'sourceControlConnectionId'],
          message: `Unknown source-control connection: ${repository.sourceControlConnectionId}`,
        });
      }
      const connection = connectionsById.get(repository.sourceControlConnectionId);
      if (
        connection &&
        (connection.workspaceId !== repository.workspaceId ||
          (repository.provider === 'github' && connection.kind !== 'github'))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['repositoryBindings', index, 'sourceControlConnectionId'],
          message: 'Repository connection crosses a workspace or provider boundary.',
        });
      }
    });
    settings.ciBindings.forEach((binding, index) => {
      assertWorkspace(binding.workspaceId, ['ciBindings', index, 'workspaceId']);
      if (!repositoryIds.has(binding.repositoryBindingId)) {
        context.addIssue({
          code: 'custom',
          path: ['ciBindings', index, 'repositoryBindingId'],
          message: `Unknown repository binding: ${binding.repositoryBindingId}`,
        });
      }
      const repository = repositoriesById.get(binding.repositoryBindingId);
      const connection = connectionsById.get(binding.sourceControlConnectionId);
      if (repository && repository.workspaceId !== binding.workspaceId) {
        context.addIssue({
          code: 'custom',
          path: ['ciBindings', index, 'repositoryBindingId'],
          message: 'CI repository crosses a workspace boundary.',
        });
      }
      if (
        !connection ||
        connection.workspaceId !== binding.workspaceId ||
        (binding.provider === 'github-actions' && connection.kind !== 'github')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['ciBindings', index, 'sourceControlConnectionId'],
          message: 'CI connection crosses a workspace or provider boundary.',
        });
      }
    });
    settings.positions.forEach((position, index) => {
      assertWorkspace(position.workspaceId, ['positions', index, 'workspaceId']);
      const allowedRoles = new Set<string>();
      position.allowedRoles.forEach((role, roleIndex) => {
        if (allowedRoles.has(role)) {
          context.addIssue({
            code: 'custom',
            path: ['positions', index, 'allowedRoles', roleIndex],
            message: `Duplicate allowed role: ${role}`,
          });
        }
        allowedRoles.add(role);
      });
    });
    settings.agentRoutePolicies.forEach((policy, index) => {
      assertWorkspace(policy.workspaceId, ['agentRoutePolicies', index, 'workspaceId']);
      const workspaceManifests = settings.providerManifests.filter(
        (manifest) => manifest.workspaceId === policy.workspaceId,
      );
      const candidateIds = new Set<string>();
      policy.candidates.forEach((candidate, candidateIndex) => {
        if (candidateIds.has(candidate.id)) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'id'],
            message: `Duplicate route candidate: ${candidate.id}`,
          });
        }
        candidateIds.add(candidate.id);
        const connection = connectionsById.get(candidate.aiConnectionId);
        if (!connection) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'aiConnectionId'],
            message: `Unknown AI connection: ${candidate.aiConnectionId}`,
          });
          return;
        }
        if (
          connection.workspaceId !== policy.workspaceId ||
          (connection.kind !== 'codex' &&
            connection.kind !== 'claude' &&
            connection.kind !== 'opencode')
        ) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'aiConnectionId'],
            message: 'Agent route crosses a workspace or provider boundary.',
          });
        }
        const expectedProviderId =
          connection.kind === 'opencode' && connection.gateway
            ? connection.gateway.providerId
            : connection.kind;
        if (workspaceManifests.length && candidate.providerId !== expectedProviderId) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'providerId'],
            message: `Route provider ${candidate.providerId} does not match account provider ${expectedProviderId}.`,
          });
        }
        const providerManifest = workspaceManifests.find(
          (manifest) => manifest.providerId === candidate.providerId,
        );
        if (workspaceManifests.length && !providerManifest) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'providerId'],
            message: `Unknown provider manifest: ${candidate.providerId}`,
          });
        }
        if (
          providerManifest &&
          candidate.capabilities.some(
            (capability) => !providerManifest.capabilities.includes(capability),
          )
        ) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'capabilities'],
            message: 'Route capabilities exceed the declared provider manifest.',
          });
        }
        if (candidate.costClass === 'free-tier') {
          if (
            !candidate.freeTierEvidence ||
            candidate.freeTierEvidence.commercialUse !== 'allowed' ||
            !candidate.freeTierEvidence.operatorApproved
          ) {
            context.addIssue({
              code: 'custom',
              path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'freeTierEvidence'],
              message:
                'A free-tier route requires operator-approved evidence that commercial use is allowed.',
            });
          }
        }
        if (
          policy.costPolicy === 'free-only' &&
          candidate.costClass !== 'free-tier' &&
          candidate.costClass !== 'local'
        ) {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'costClass'],
            message: 'A free-only route may contain only free-tier or local candidates.',
          });
        }
        if (policy.costPolicy === 'local-only' && candidate.costClass !== 'local') {
          context.addIssue({
            code: 'custom',
            path: ['agentRoutePolicies', index, 'candidates', candidateIndex, 'costClass'],
            message: 'A local-only route may contain only local candidates.',
          });
        }
      });
    });
    settings.agentProfiles.forEach((profile, index) => {
      assertWorkspace(profile.workspaceId, ['agentProfiles', index, 'workspaceId']);
      const position = positionsById.get(profile.positionId);
      if (!position) {
        context.addIssue({
          code: 'custom',
          path: ['agentProfiles', index, 'positionId'],
          message: `Unknown position: ${profile.positionId}`,
        });
      } else if (position.workspaceId !== profile.workspaceId) {
        context.addIssue({
          code: 'custom',
          path: ['agentProfiles', index, 'positionId'],
          message: 'Agent position crosses a workspace boundary.',
        });
      }
      const routePolicy = routePoliciesById.get(profile.routePolicyId);
      if (!routePolicy) {
        context.addIssue({
          code: 'custom',
          path: ['agentProfiles', index, 'routePolicyId'],
          message: `Unknown agent route policy: ${profile.routePolicyId}`,
        });
      } else if (routePolicy.workspaceId !== profile.workspaceId) {
        context.addIssue({
          code: 'custom',
          path: ['agentProfiles', index, 'routePolicyId'],
          message: 'Agent route policy crosses a workspace boundary.',
        });
      }
    });
    settings.agentTeams.forEach((team, index) => {
      assertWorkspace(team.workspaceId, ['agentTeams', index, 'workspaceId']);
      const assignedRoles = new Set<string>();
      team.assignments.forEach((assignment, assignmentIndex) => {
        if (assignedRoles.has(assignment.role)) {
          context.addIssue({
            code: 'custom',
            path: ['agentTeams', index, 'assignments', assignmentIndex, 'role'],
            message: `Duplicate team role: ${assignment.role}`,
          });
        }
        assignedRoles.add(assignment.role);
        const agentIds = [assignment.primaryAgentId, ...assignment.fallbackAgentIds];
        if (new Set(agentIds).size !== agentIds.length) {
          context.addIssue({
            code: 'custom',
            path: ['agentTeams', index, 'assignments', assignmentIndex, 'fallbackAgentIds'],
            message: 'Primary and fallback agents must be unique.',
          });
        }
        agentIds.forEach((agentId, agentIndex) => {
          const profile = profilesById.get(agentId);
          const path =
            agentIndex === 0
              ? ['agentTeams', index, 'assignments', assignmentIndex, 'primaryAgentId']
              : [
                  'agentTeams',
                  index,
                  'assignments',
                  assignmentIndex,
                  'fallbackAgentIds',
                  agentIndex - 1,
                ];
          if (!profile) {
            context.addIssue({ code: 'custom', path, message: `Unknown agent: ${agentId}` });
            return;
          }
          if (profile.workspaceId !== team.workspaceId) {
            context.addIssue({
              code: 'custom',
              path,
              message: 'Team agent crosses a workspace boundary.',
            });
          }
          const position = positionsById.get(profile.positionId);
          if (position && !position.allowedRoles.includes(assignment.role)) {
            context.addIssue({
              code: 'custom',
              path,
              message: `Agent position does not allow role: ${assignment.role}`,
            });
          }
        });
      });
    });
    settings.deliveryContexts.forEach((delivery, index) => {
      assertWorkspace(delivery.workspaceId, ['deliveryContexts', index, 'workspaceId']);
      for (const sourceId of delivery.workItemSourceIds) {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryContexts', index, 'workItemSourceIds'],
            message: `Unknown work-item source: ${sourceId}`,
          });
        }
        if (sourcesById.get(sourceId)?.workspaceId !== delivery.workspaceId) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryContexts', index, 'workItemSourceIds'],
            message: 'Delivery source crosses a workspace boundary.',
          });
        }
      }
      for (const repositoryId of delivery.repositoryBindingIds) {
        if (!repositoryIds.has(repositoryId)) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryContexts', index, 'repositoryBindingIds'],
            message: `Unknown repository binding: ${repositoryId}`,
          });
        }
        if (repositoriesById.get(repositoryId)?.workspaceId !== delivery.workspaceId) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryContexts', index, 'repositoryBindingIds'],
            message: 'Delivery repository crosses a workspace boundary.',
          });
        }
      }
      for (const ciId of delivery.ciBindingIds) {
        if (!ciIds.has(ciId)) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryContexts', index, 'ciBindingIds'],
            message: `Unknown CI binding: ${ciId}`,
          });
        }
        if (ciById.get(ciId)?.workspaceId !== delivery.workspaceId) {
          context.addIssue({
            code: 'custom',
            path: ['deliveryContexts', index, 'ciBindingIds'],
            message: 'Delivery CI binding crosses a workspace boundary.',
          });
        }
      }
      if (!teamIds.has(delivery.agentTeamId)) {
        context.addIssue({
          code: 'custom',
          path: ['deliveryContexts', index, 'agentTeamId'],
          message: `Unknown agent team: ${delivery.agentTeamId}`,
        });
      }
      if (teamsById.get(delivery.agentTeamId)?.workspaceId !== delivery.workspaceId) {
        context.addIssue({
          code: 'custom',
          path: ['deliveryContexts', index, 'agentTeamId'],
          message: 'Delivery agent team crosses a workspace boundary.',
        });
      }
      if (
        delivery.defaultRepositoryBindingId &&
        !delivery.repositoryBindingIds.includes(delivery.defaultRepositoryBindingId)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['deliveryContexts', index, 'defaultRepositoryBindingId'],
          message: 'Default repository must belong to this delivery context.',
        });
      }
    });
    const targetIds = new Set<string>();
    settings.deliveryTargets.forEach((target, index) => {
      const repository = settings.repositoryBindings.find(
        (candidate) => candidate.id === target.repositoryBindingId,
      );
      if (
        !repository ||
        repository.workspaceId !== target.workspaceId ||
        targetIds.has(target.id)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['deliveryTargets', index],
          message: 'Delivery target needs a unique ID and a repository in its workspace.',
        });
      }
      targetIds.add(target.id);
    });
    const enabledContexts = new Set<string>();
    settings.deliveryContexts.forEach((delivery, index) => {
      if (!delivery.enabled) return;
      if (enabledContexts.has(delivery.workspaceId)) {
        context.addIssue({
          code: 'custom',
          path: ['deliveryContexts', index, 'workspaceId'],
          message: `Only one enabled delivery context is allowed per workspace: ${delivery.workspaceId}`,
        });
      }
      enabledContexts.add(delivery.workspaceId);
    });
    settings.savedViews.forEach((view, viewIndex) => {
      const selected = new Set<string>();
      view.workspaceIds.forEach((workspaceId, workspaceIndex) => {
        assertWorkspace(workspaceId, ['savedViews', viewIndex, 'workspaceIds', workspaceIndex]);
        if (selected.has(workspaceId)) {
          context.addIssue({
            code: 'custom',
            path: ['savedViews', viewIndex, 'workspaceIds', workspaceIndex],
            message: `Duplicate workspace in saved view: ${workspaceId}`,
          });
        }
        selected.add(workspaceId);
      });
    });
  });
