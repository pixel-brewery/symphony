// #region Imports

import { z } from 'zod';

// #endregion

export const continuousIntegrationUsageReportSchema = z.object({
  repositoryBindingId: z.string().min(1),
  account: z
    .object({
      type: z.enum(['user', 'organization']),
      login: z.string().min(1),
      planName: z.string().min(1).optional(),
    })
    .optional(),
  period: z
    .object({
      startedAt: z.iso.datetime(),
      resetsAt: z.iso.datetime(),
    })
    .optional(),
  minutes: z
    .object({
      used: z.number().nonnegative(),
      included: z.number().nonnegative().optional(),
      remaining: z.number().nonnegative().optional(),
      usedPercent: z.number().min(0).max(100).optional(),
      remainingPercent: z.number().min(0).max(100).optional(),
    })
    .optional(),
  error: z.string().min(1).optional(),
});
