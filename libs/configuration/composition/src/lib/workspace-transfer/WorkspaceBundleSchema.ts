// #region Imports

import { z } from 'zod';
import {
  agentProfileSchema,
  agentTeamSchema,
  positionDefinitionSchema,
} from '@symphony/configuration-team';
import {
  agentRoutePolicySchema,
  providerCapabilityManifestSchema,
} from '@symphony/configuration-ai';
import { ciBindingSchema } from '@symphony/configuration-ci';
import {
  deliveryContextSchema,
  repositoryBindingSchema,
  workspaceSchema,
} from '@symphony/configuration-workspace';
import { feedbackIntakeSourceSchema } from '@symphony/configuration-feedback';
import { workItemSourceSchema } from '@symphony/configuration-work';
import { portableConnectionSchema } from './PortableConnectionSchema';
import { skillPackageFileSchema } from './SkillPackageFileSchema';
const portableRepositoryBindingSchema = repositoryBindingSchema.omit({ localPath: true });

const portableFeedbackIntakeSourceSchema = feedbackIntakeSourceSchema
  .omit({ credentialRef: true })
  .extend({ enabled: z.literal(false) });

const embeddedSkillSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(2_000),
  instructions: z.string().min(1).max(500_000),
  openaiYaml: z.string().max(100_000),
  files: z.array(skillPackageFileSchema).max(250).readonly(),
});

// #endregion

export const workspaceBundleSchema = z
  .object({
    format: z.literal('symphony.workspace'),
    version: z.literal(2),
    exportedAt: z.iso.datetime(),
    workspace: workspaceSchema,
    connections: z.array(portableConnectionSchema).max(100).readonly(),
    workItemSources: z.array(workItemSourceSchema).max(100).readonly(),
    repositoryBindings: z.array(portableRepositoryBindingSchema).max(100).readonly(),
    ciBindings: z.array(ciBindingSchema).max(100).readonly(),
    positions: z.array(positionDefinitionSchema).max(100).readonly(),
    providerManifests: z.array(providerCapabilityManifestSchema).max(100).readonly().default([]),
    agentRoutePolicies: z.array(agentRoutePolicySchema).max(100).readonly(),
    agentProfiles: z.array(agentProfileSchema).max(100).readonly(),
    agentTeams: z.array(agentTeamSchema).max(100).readonly(),
    deliveryContexts: z.array(deliveryContextSchema).max(100).readonly(),
    feedbackIntakeSources: z
      .array(portableFeedbackIntakeSourceSchema)
      .max(100)
      .readonly()
      .default([]),
    skills: z.array(embeddedSkillSchema).max(100).readonly(),
  })
  .superRefine((bundle, context) => {
    const workspaceId = bundle.workspace.id;
    const collections = [
      ['connections', bundle.connections],
      ['workItemSources', bundle.workItemSources],
      ['repositoryBindings', bundle.repositoryBindings],
      ['ciBindings', bundle.ciBindings],
      ['positions', bundle.positions],
      ['providerManifests', bundle.providerManifests],
      ['agentRoutePolicies', bundle.agentRoutePolicies],
      ['agentProfiles', bundle.agentProfiles],
      ['agentTeams', bundle.agentTeams],
      ['deliveryContexts', bundle.deliveryContexts],
      ['feedbackIntakeSources', bundle.feedbackIntakeSources],
    ] as const;
    for (const [name, records] of collections) {
      records.forEach((record, index) => {
        if (record.workspaceId !== workspaceId) {
          context.addIssue({
            code: 'custom',
            path: [name, index, 'workspaceId'],
            message: `Record does not belong to exported workspace ${workspaceId}.`,
          });
        }
      });
    }
    const skillNames = new Set<string>();
    bundle.skills.forEach((skill, index) => {
      if (skillNames.has(skill.name)) {
        context.addIssue({
          code: 'custom',
          path: ['skills', index, 'name'],
          message: `Duplicate embedded skill: ${skill.name}`,
        });
      }
      skillNames.add(skill.name);
    });
  });
