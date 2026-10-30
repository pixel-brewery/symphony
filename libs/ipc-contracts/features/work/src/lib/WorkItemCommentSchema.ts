// #region Imports

import { z } from 'zod';
import { workItemAssigneeSchema } from './WorkItemAssigneeSchema';

// #endregion

export const workItemCommentSchema = z.object({
  id: z.string().min(1),
  author: workItemAssigneeSchema.optional(),
  body: z.string(),
  bodyFormat: z.enum(['plain-text', 'markdown', 'html']).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  url: z.url().optional(),
});
