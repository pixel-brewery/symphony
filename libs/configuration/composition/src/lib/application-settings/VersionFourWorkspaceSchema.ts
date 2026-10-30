// #region Imports

import { z } from 'zod';

// #endregion

export const versionFourWorkspaceSchema = z
  .object({ localCiEnabled: z.boolean().optional() })
  .passthrough();
