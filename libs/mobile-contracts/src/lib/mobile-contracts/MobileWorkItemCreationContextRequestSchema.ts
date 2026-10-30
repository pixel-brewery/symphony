// #region Imports

import { z } from 'zod';

// #endregion

export const mobileWorkItemCreationContextRequestSchema = z
  .object({ repository: z.string().min(1).max(500).optional() })
  .strict();
