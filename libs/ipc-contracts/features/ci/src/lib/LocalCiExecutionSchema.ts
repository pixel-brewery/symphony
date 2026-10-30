// #region Imports

import { z } from 'zod';

// #endregion

export const localCiExecutionSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  ciRunId: z.string().min(1),
  runAttempt: z.number().int().positive().optional(),
  revision: z.string().min(1).optional(),
  state: z.enum(['succeeded', 'failed', 'cancelled']),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  failureLog: z.string().max(64_000).optional(),
  localDiagnostics: z.string().max(64_000).optional(),
  runner: z
    .object({
      kind: z.literal('managed-linux-vm'),
      os: z.literal('linux'),
      architecture: z.enum(['arm64', 'x64']),
      label: z.string().min(1),
      imageVersion: z.string().min(1),
    })
    .optional(),
});
