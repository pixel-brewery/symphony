// #region Imports

import { z } from 'zod';
import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';

// #endregion

export const agenticDeliveryPolicySchema = z
  .object({
    enabled: z.boolean(),
    observeFailures: z.boolean(),
    aiDiagnosisEnabled: z.boolean(),
    sourceRepairEnabled: z.boolean(),
    workflowRepairEnabled: z.boolean(),
    reviewFeedbackEnabled: z.boolean(),
    managedBranchUpdatesEnabled: z.boolean(),
    conflictSerializationEnabled: z.boolean().default(false),
    ciRerunEnabled: z.boolean(),
    replacementPullRequestEnabled: z.boolean(),
    diagnosisTokenBudget: z.number().int().min(1_000).max(1_000_000),
    repairTokenBudget: z.number().int().min(1_000).max(2_000_000),
    dailyTokenBudget: z.number().int().min(1_000).max(10_000_000),
    maxAttempts: z.number().int().min(1).max(10),
    maxParallelRepairs: z.number().int().min(1).max(16),
    cooldownMinutes: z.number().int().min(1).max(1_440),
  })
  .strict()
  .default(defaultAgenticDeliveryPolicy);
