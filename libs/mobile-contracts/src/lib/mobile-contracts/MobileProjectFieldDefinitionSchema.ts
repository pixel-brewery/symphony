// #region Imports

import { z } from 'zod';
import { mobileAssistanceActionSchema } from './MobileAssistanceActionSchema';
import { mobileProjectFieldRoleSchema } from './MobileProjectFieldRoleSchema';
import { mobileWorkflowStageIdSchema } from './MobileWorkflowStageIdSchema';
const mobileProjectFieldOptionSchema = z.object({
  id: z.string().min(1).max(500),
  label: z.string().min(1).max(500),
  description: z.string().max(10_000).optional(),
  color: z.string().max(100).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional(),
  duration: z.number().int().positive().optional(),
  stageId: mobileWorkflowStageIdSchema.optional(),
  assistanceAction: mobileAssistanceActionSchema.optional(),
});

const mobileProjectFieldDefinitionBase = {
  id: z.string().min(1).max(500),
  name: z.string().min(1).max(500),
  role: mobileProjectFieldRoleSchema,
} as const;

// #endregion

export const mobileProjectFieldDefinitionSchema = z.discriminatedUnion('type', [
  z.object({ ...mobileProjectFieldDefinitionBase, type: z.literal('text') }),
  z.object({ ...mobileProjectFieldDefinitionBase, type: z.literal('number') }),
  z.object({ ...mobileProjectFieldDefinitionBase, type: z.literal('date') }),
  z.object({
    ...mobileProjectFieldDefinitionBase,
    type: z.literal('single-select'),
    options: z.array(mobileProjectFieldOptionSchema).max(500).readonly(),
  }),
  z.object({
    ...mobileProjectFieldDefinitionBase,
    type: z.literal('multi-select'),
    options: z.array(mobileProjectFieldOptionSchema).max(500).readonly(),
  }),
  z.object({
    ...mobileProjectFieldDefinitionBase,
    type: z.literal('iteration'),
    options: z.array(mobileProjectFieldOptionSchema).max(500).readonly(),
  }),
]);
