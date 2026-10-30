// #region Imports

import { z } from 'zod';
import { executionKindSchema } from '@symphony/ipc-contracts-execution';

// #endregion

export const activeBackgroundOperationsSchema = z.object({
  executions: z
    .array(
      z.object({
        id: z.string().min(1),
        workItemId: z.string().min(1),
        kind: executionKindSchema,
      }),
    )
    .readonly(),
  issueDrafts: z
    .array(
      z.object({
        operationId: z.string().min(1).max(200),
        repository: z.string().regex(/^[^/\s]+\/[^/\s]+$/u),
      }),
    )
    .readonly(),
  verifications: z.array(z.object({ repositoryBindingId: z.string().min(1) })).readonly(),
  localCiRuns: z.array(z.object({ runId: z.string().min(1) })).readonly(),
  runtimeDependencyInstallations: z
    .array(z.object({ command: z.enum(['git', 'gh', 'codex', 'claude', 'opencode']) }))
    .max(1)
    .readonly(),
});
