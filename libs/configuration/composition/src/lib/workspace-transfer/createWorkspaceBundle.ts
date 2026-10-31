// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { ProviderConnection } from '../ProviderConnection';
import type { IEditableSkillPackage, ISkillPackageDocument } from '@symphony/domain-skills';
import { z } from 'zod';
import type { WorkspaceBundle } from './WorkspaceBundle';
import { portableConnectionSchema } from './PortableConnectionSchema';
import { workspaceBundleSchema } from './WorkspaceBundleSchema';

// #endregion

export function createWorkspaceBundle(
  settings: IApplicationSettings,
  workspaceId: string,
  availableSkills: readonly ISkillPackageDocument[],
  exportedAt = new Date(),
): WorkspaceBundle {
  const workspace = settings.workspaces.find((candidate) => candidate.id === workspaceId);
  if (!workspace) throw new Error(`Unknown workspace: ${workspaceId}`);
  const referencedUserSkillIds = new Set(
    settings.agentTeams
      .filter((team) => team.workspaceId === workspaceId)
      .flatMap((team) => team.assignments.map((assignment) => assignment.skillId))
      .filter((id): id is string => id !== null)
      .filter((id) => id.startsWith('user:')),
  );
  const skillsById = new Map(availableSkills.map((skill) => [skill.id, skill]));
  const skills = [...referencedUserSkillIds].sort().map((id) => {
    const skill = skillsById.get(id);
    if (!skill || skill.source !== 'user') {
      throw new Error(`Referenced shared skill is unavailable for export: ${id}`);
    }
    return editableSkill(skill);
  });

  return workspaceBundleSchema.parse({
    format: 'symphony.workspace',
    version: 2,
    exportedAt: exportedAt.toISOString(),
    workspace,
    connections: settings.connections
      .filter((connection) => connection.workspaceId === workspaceId)
      .map(portableConnection),
    workItemSources: settings.workItemSources.filter((item) => item.workspaceId === workspaceId),
    repositoryBindings: settings.repositoryBindings
      .filter((item) => item.workspaceId === workspaceId)
      .map((binding) => ({
        id: binding.id,
        workspaceId: binding.workspaceId,
        sourceControlConnectionId: binding.sourceControlConnectionId,
        displayName: binding.displayName,
        provider: binding.provider,
        host: binding.host,
        owner: binding.owner,
        name: binding.name,
        defaultBranch: binding.defaultBranch,
        enabled: binding.enabled,
      })),
    ciBindings: settings.ciBindings.filter((item) => item.workspaceId === workspaceId),
    positions: settings.positions.filter((item) => item.workspaceId === workspaceId),
    providerManifests: settings.providerManifests.filter(
      (item) => item.workspaceId === workspaceId,
    ),
    agentRoutePolicies: settings.agentRoutePolicies.filter(
      (item) => item.workspaceId === workspaceId,
    ),
    agentProfiles: settings.agentProfiles.filter((item) => item.workspaceId === workspaceId),
    agentTeams: settings.agentTeams.filter((item) => item.workspaceId === workspaceId),
    deliveryContexts: settings.deliveryContexts.filter((item) => item.workspaceId === workspaceId),
    feedbackIntakeSources: settings.feedbackIntakeSources
      .filter((item) => item.workspaceId === workspaceId)
      .map((source) => ({
        id: source.id,
        workspaceId: source.workspaceId,
        displayName: source.displayName,
        provider: source.provider,
        tenantId: source.tenantId,
        clientId: source.clientId,
        teamId: source.teamId,
        channelId: source.channelId,
        targetWorkItemSourceId: source.targetWorkItemSourceId,
        targetRepositoryBindingId: source.targetRepositoryBindingId,
        enabled: false as const,
      })),
    skills,
  });
}

function portableConnection(
  connection: ProviderConnection,
): z.infer<typeof portableConnectionSchema> {
  switch (connection.kind) {
    case 'azure-devops':
      return {
        id: connection.id,
        workspaceId: connection.workspaceId,
        kind: connection.kind,
        displayName: connection.displayName,
        organization: connection.organization,
        ...(connection.tenantId ? { tenantId: connection.tenantId } : {}),
      };
    case 'github':
      return {
        id: connection.id,
        workspaceId: connection.workspaceId,
        kind: connection.kind,
        displayName: connection.displayName,
        hostname: connection.hostname,
        gitProtocol: connection.gitProtocol,
      };
    case 'codex':
      return {
        id: connection.id,
        workspaceId: connection.workspaceId,
        kind: connection.kind,
        displayName: connection.displayName,
        credentialSource: 'isolated',
      };
    case 'claude':
      return {
        id: connection.id,
        workspaceId: connection.workspaceId,
        kind: connection.kind,
        displayName: connection.displayName,
        credentialSource: 'isolated',
      };
    case 'opencode':
      return {
        id: connection.id,
        workspaceId: connection.workspaceId,
        kind: connection.kind,
        displayName: connection.displayName,
        ...(connection.gateway ? { gateway: connection.gateway } : {}),
      };
  }
}

function editableSkill(skill: ISkillPackageDocument): IEditableSkillPackage {
  return {
    name: skill.name,
    description: skill.description,
    instructions: skill.instructions,
    openaiYaml: skill.openaiYaml,
    files: skill.files.filter((file) => file.kind !== 'metadata'),
  };
}
