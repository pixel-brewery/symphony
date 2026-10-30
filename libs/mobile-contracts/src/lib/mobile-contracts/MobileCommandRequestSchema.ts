// #region Imports

import { z } from 'zod';

// #endregion

export const mobileCommandRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('analyze'),
    workItemId: z.string().min(1),
    prompt: z.string().trim().max(50_000).optional(),
  }),
  z.object({
    action: z.literal('solve'),
    workItemId: z.string().min(1),
    feedback: z.string().trim().max(50_000).optional(),
  }),
  z.object({ action: z.literal('cancel-execution'), executionId: z.string().min(1) }),
  z.object({ action: z.literal('remove-queue-entry'), entryId: z.string().min(1) }),
  z.object({
    action: z.literal('move'),
    workItemId: z.string().min(1),
    boardColumnId: z.string().min(1),
  }),
  z.object({
    action: z.literal('decide'),
    workItemId: z.string().min(1),
    optionId: z.string().min(1),
  }),
  z.object({
    action: z.literal('publish-pull-request'),
    workItemId: z.string().min(1),
    executionId: z.string().min(1),
  }),
]);
