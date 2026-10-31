// #region Imports

import { z } from 'zod';
import { applicationSettingsSchema } from '@symphony/configuration-composition';

// #endregion

export const workspaceImportResultSchema = z.object({
  settings: applicationSettingsSchema,
  workspaceId: z.string().min(1),
  workspaceName: z.string().min(1),
  replaced: z.boolean(),
  importedSkillCount: z.number().int().nonnegative(),
  requiredConnectionIds: z.array(z.string().min(1)).readonly(),
  repositoryBindingIds: z.array(z.string().min(1)).readonly(),
});
