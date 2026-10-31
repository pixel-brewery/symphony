// #region Imports

import { z } from 'zod';
import { projectFieldValueSchema } from './ProjectFieldValueSchema';

// #endregion

export const issueDraftRequestSchema = z.object({
  operationId: z.string().min(1).max(200),
  workspaceId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  repository: z.string().regex(/^[^/\s]+\/[^/\s]+$/u),
  prompt: z.string().trim().min(1).max(50_000),
  /** Agent that should formulate the draft; defaults to the workspace creation assignment. */
  agentProfileId: z.string().min(1).optional(),
  title: z.string().max(256).optional(),
  body: z.string().max(1_000_000).optional(),
  projectFields: z.array(projectFieldValueSchema).max(200).readonly().optional(),
});
