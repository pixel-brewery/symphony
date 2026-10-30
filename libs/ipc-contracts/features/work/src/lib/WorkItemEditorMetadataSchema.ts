// #region Imports

import { z } from 'zod';
import { boardColumnSchema } from './BoardColumnSchema';
import { projectFieldDefinitionSchema } from './ProjectFieldDefinitionSchema';
import { skillManifestSchema } from '@symphony/ipc-contracts-skills';
import { workItemSchema } from './WorkItemSchema';
const workItemEditorMetadataBaseSchema = z.object({
  repositories: z.array(z.string().min(1).max(500)).readonly(),
  workItemTypes: z.array(z.string().min(1).max(200)).max(100).readonly().optional(),
  defaultWorkItemType: z.string().min(1).max(200).optional(),
  labels: z
    .array(
      z.object({
        name: z.string().min(1),
        color: z.string().regex(/^[0-9a-fA-F]{6}$/u),
        description: z.string().optional(),
      }),
    )
    .readonly(),
  assignees: workItemSchema.shape.assignees,
  states: z.array(boardColumnSchema).readonly(),
  projectFields: z.array(projectFieldDefinitionSchema).max(200).readonly(),
});

// #endregion

export const workItemEditorMetadataSchema = workItemEditorMetadataBaseSchema.extend({
  issueCreatorSkill: skillManifestSchema.optional(),
  analysisSkill: skillManifestSchema.optional(),
  solutionSkill: skillManifestSchema.optional(),
});
