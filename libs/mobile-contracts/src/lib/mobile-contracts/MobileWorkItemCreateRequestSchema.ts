// #region Imports

import { z } from 'zod';
import { mobileProjectFieldValueSchema } from './MobileProjectFieldValueSchema';

// #endregion

export const mobileWorkItemCreateRequestSchema = z
  .object({
    workspaceId: z.string().min(1).max(500),
    title: z.string().trim().min(1).max(256),
    body: z.string().max(1_000_000),
    repository: z.string().min(1).max(500),
    projectFields: z.array(mobileProjectFieldValueSchema).max(200).readonly(),
    labels: z.array(z.string().min(1).max(100)).max(100).readonly(),
    assignees: z.array(z.string().min(1).max(100)).max(100).readonly(),
  })
  .strict();
