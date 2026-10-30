// #region Imports

import { z } from 'zod';
import { mobileProjectFieldValueSchema } from './MobileProjectFieldValueSchema';

// #endregion

export const mobileIssueDraftRequestSchema = z
  .object({
    operationId: z.string().min(1).max(200),
    workspaceId: z.string().min(1).max(500),
    repository: z.string().regex(/^[^/\s]+\/[^/\s]+$/u),
    prompt: z.string().trim().min(1).max(50_000),
    title: z.string().max(256).optional(),
    body: z.string().max(1_000_000).optional(),
    projectFields: z.array(mobileProjectFieldValueSchema).max(200).readonly().optional(),
  })
  .strict();
