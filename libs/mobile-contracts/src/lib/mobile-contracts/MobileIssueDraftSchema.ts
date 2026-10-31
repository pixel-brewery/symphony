// #region Imports

import { z } from 'zod';
import { mobileProjectFieldValueSchema } from './MobileProjectFieldValueSchema';

// #endregion

export const mobileIssueDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(256),
    body: z.string().trim().min(1).max(1_000_000),
    projectFields: z.array(mobileProjectFieldValueSchema).max(200).readonly(),
    labels: z.array(z.string().min(1).max(100)).max(100).readonly(),
    assignees: z.array(z.string().min(1).max(100)).max(100).readonly(),
  })
  .strict();
