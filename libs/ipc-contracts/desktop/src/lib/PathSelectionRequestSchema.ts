// #region Imports

import { z } from 'zod';

// #endregion

export const pathSelectionRequestSchema = z.object({
  kind: z.enum(['file', 'directory']),
  title: z.string().min(1).max(120).optional(),
  defaultPath: z.string().min(1).max(4_096).optional(),
  filters: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        extensions: z.array(z.string().min(1).max(32)).min(1).max(32).readonly(),
      }),
    )
    .max(16)
    .readonly()
    .optional(),
});
