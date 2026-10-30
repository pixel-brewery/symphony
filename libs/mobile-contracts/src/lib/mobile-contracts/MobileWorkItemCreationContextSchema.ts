// #region Imports

import { z } from 'zod';
import { externalHttpUrlSchema } from './ExternalHttpUrlSchema';
import { mobileProjectFieldDefinitionSchema } from './MobileProjectFieldDefinitionSchema';
const mobileSkillSummarySchema = z.object({
  id: z.string().min(1).max(500),
  name: z.string().min(1).max(500),
  description: z.string().max(10_000),
});

// #endregion

export const mobileWorkItemCreationContextSchema = z
  .object({
    version: z.literal(1),
    workspaceId: z.string().min(1).max(500),
    workspaceName: z.string().min(1).max(500),
    repositories: z.array(z.string().min(1).max(500)).max(500).readonly(),
    labels: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          color: z.string().regex(/^[0-9a-fA-F]{6}$/u),
          description: z.string().max(10_000).optional(),
        }),
      )
      .max(500)
      .readonly(),
    assignees: z
      .array(
        z.object({
          login: z.string().min(1).max(100),
          displayName: z.string().min(1).max(500).optional(),
          avatarUrl: externalHttpUrlSchema.optional(),
        }),
      )
      .max(500)
      .readonly(),
    projectFields: z.array(mobileProjectFieldDefinitionSchema).max(200).readonly(),
    issueCreatorSkill: mobileSkillSummarySchema.optional(),
    analysisSkill: mobileSkillSummarySchema.optional(),
    solutionSkill: mobileSkillSummarySchema.optional(),
  })
  .strict();
