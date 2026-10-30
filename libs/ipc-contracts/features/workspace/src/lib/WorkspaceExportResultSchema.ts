// #region Imports

import { z } from 'zod';

// #endregion

export const workspaceExportResultSchema = z.object({
  workspaceId: z.string().min(1),
  workspaceName: z.string().min(1),
  path: z.string().min(1),
  embeddedSkillCount: z.number().int().nonnegative(),
});
