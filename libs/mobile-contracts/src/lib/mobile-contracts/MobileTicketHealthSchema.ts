// #region Imports

import { z } from 'zod';

// #endregion

/**
 * What the desktop found wrong with the ticket, from the same inspection the board card and
 * the task drawer report. Repairs stay on the desktop: they write provider fields, and the
 * phone offers no place to review the exact writes first.
 */
export const mobileTicketHealthSchema = z.object({
  severity: z.enum(['blocker', 'incomplete']),
  issues: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        severity: z.enum(['blocker', 'incomplete']),
        summary: z.string().min(1).max(500),
        detail: z.string().max(2_000),
        remedy: z.string().max(2_000),
      }),
    )
    .max(50)
    .readonly(),
});
