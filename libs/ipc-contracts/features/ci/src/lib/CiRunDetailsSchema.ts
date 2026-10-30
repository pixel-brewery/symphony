// #region Imports

import { ciWorkflowGraphSchema } from './CiWorkflowGraphSchema';
import { ciPendingApprovalSchema } from './CiPendingApprovalSchema';
import { z } from 'zod';
import { ciRunLogStateSchema } from './CiRunLogStateSchema';
const ciRunStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: ciRunLogStateSchema,
  startedAt: z.iso.datetime().optional(),
  finishedAt: z.iso.datetime().optional(),
});

// #endregion

export const ciRunDetailsSchema = z.object({
  runId: z.string().min(1),
  jobs: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        workflowJobId: z.string().min(1).optional(),
        status: ciRunLogStateSchema,
        startedAt: z.iso.datetime().optional(),
        finishedAt: z.iso.datetime().optional(),
        externalUrl: z.url().optional(),
        steps: z.array(ciRunStepSchema).max(1_000).readonly(),
      }),
    )
    .max(1000)
    .readonly(),
  workflowGraph: ciWorkflowGraphSchema.optional(),
  pendingApprovals: z.array(ciPendingApprovalSchema).max(100).readonly().optional(),
  logOutput: z.string().max(64_000).optional(),
  failureLog: z.string().max(64_000).optional(),
  localDiagnostics: z.string().max(64_000).optional(),
});
