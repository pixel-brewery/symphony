// #region Imports

import { z } from 'zod';

// #endregion

export const cancelledBackgroundOperationsSchema = z.object({
  executionIds: z.array(z.string().min(1)).readonly(),
  issueDraftOperationIds: z.array(z.string().min(1).max(200)).readonly(),
  verificationRepositoryBindingIds: z.array(z.string().min(1)).readonly(),
  localCiRunIds: z.array(z.string().min(1)).readonly(),
  runtimeDependencyInstallationCommands: z
    .array(z.enum(['git', 'gh', 'codex', 'claude', 'opencode']))
    .max(1)
    .readonly(),
});
