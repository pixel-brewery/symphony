// #region Imports

import { z } from 'zod';
const executionEventKindSchema = z.enum([
  'execution.started',
  'workspace.prepared',
  'agent.progress',
  'analysis.completed',
  'solution.started',
  'solver.progress',
  'solution.completed',
  'pull-request.created',
  'execution.cancelled',
  'execution.warning',
  'execution.failed',
]);

const executionEventOriginSchema = z.enum(['orchestrator', 'agent']);

const executionEventCategorySchema = z.enum([
  'status',
  'message',
  'reasoning',
  'command',
  'file-change',
  'tool',
]);

// #endregion

export const executionEventSchema = z.object({
  id: z.string(),
  executionId: z.string(),
  kind: executionEventKindSchema,
  message: z.string(),
  origin: executionEventOriginSchema.optional(),
  category: executionEventCategorySchema.optional(),
  actor: z.string().optional(),
  occurredAt: z.string(),
  sequence: z.number().int().positive(),
});
