// #region Imports

import { z } from 'zod';
import { assistanceActionSchema } from './AssistanceActionSchema';
import { projectFieldRoleSchema } from './ProjectFieldRoleSchema';
import { workflowStageIdSchema } from '@symphony/ipc-contracts-workflow';
const projectFieldOptionSchema = z.object({
  id: z.string().min(1).max(500),
  label: z.string().min(1).max(500),
  description: z.string().max(10_000).optional(),
  color: z.string().max(100).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional(),
  duration: z.number().int().positive().optional(),
  stageId: workflowStageIdSchema.optional(),
  assistanceAction: assistanceActionSchema.optional(),
});

const projectFieldDefinitionBase = {
  id: z.string().min(1).max(500),
  name: z.string().min(1).max(500),
  role: projectFieldRoleSchema,
  sourceId: z.string().min(1).max(500).optional(),
} as const;

// #endregion

export const projectFieldDefinitionSchema = z.discriminatedUnion('type', [
  z.object({ ...projectFieldDefinitionBase, type: z.literal('text') }),
  z.object({ ...projectFieldDefinitionBase, type: z.literal('number') }),
  z.object({ ...projectFieldDefinitionBase, type: z.literal('date') }),
  z.object({
    ...projectFieldDefinitionBase,
    type: z.literal('single-select'),
    options: z.array(projectFieldOptionSchema).max(500).readonly(),
  }),
  z.object({
    ...projectFieldDefinitionBase,
    type: z.literal('multi-select'),
    options: z.array(projectFieldOptionSchema).max(500).readonly(),
  }),
  z.object({
    ...projectFieldDefinitionBase,
    type: z.literal('iteration'),
    options: z.array(projectFieldOptionSchema).max(500).readonly(),
  }),
]);
