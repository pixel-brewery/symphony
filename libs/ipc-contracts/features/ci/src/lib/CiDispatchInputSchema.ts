// #region Imports

import { z } from 'zod';

// #endregion

export const ciDispatchInputSchema = z.object({
  id: z.string().min(1).max(128),
  description: z.string().max(4000),
  type: z.enum(['string', 'boolean', 'number', 'choice', 'environment']),
  required: z.boolean(),
  defaultValue: z.string().max(4000).optional(),
  options: z.array(z.string()).max(100).readonly().optional(),
});
