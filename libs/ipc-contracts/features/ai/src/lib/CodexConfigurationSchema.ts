// #region Imports

import { z } from 'zod';

// #endregion

export const codexConfigurationSchema = z.object({
  models: z
    .array(
      z.object({
        id: z.string().min(1),
        displayName: z.string().min(1),
        description: z.string(),
        isDefault: z.boolean(),
        defaultReasoningEffort: z.string().min(1),
        reasoningEfforts: z
          .array(
            z.object({
              id: z.string().min(1),
              description: z.string(),
            }),
          )
          .readonly(),
      }),
    )
    .readonly(),
  usage: z
    .object({
      planType: z.string().optional(),
      windows: z
        .array(
          z.object({
            usedPercent: z.number().min(0).max(100),
            remainingPercent: z.number().min(0).max(100),
            windowDurationMinutes: z.number().int().positive().optional(),
            resetsAt: z.iso.datetime().optional(),
          }),
        )
        .readonly(),
      credits: z
        .object({
          hasCredits: z.boolean(),
          unlimited: z.boolean(),
          balance: z.string().optional(),
        })
        .optional(),
      tokenUsage: z
        .object({
          lifetimeTokens: z.number().int().nonnegative().optional(),
          peakDailyTokens: z.number().int().nonnegative().optional(),
          currentStreakDays: z.number().int().nonnegative().optional(),
        })
        .optional(),
    })
    .optional(),
  error: z.string().optional(),
});
