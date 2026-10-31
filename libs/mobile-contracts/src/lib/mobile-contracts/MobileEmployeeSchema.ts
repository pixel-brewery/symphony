// #region Imports

import { z } from 'zod';

// #endregion

/** Appearance and actual work only; no account credentials or routing configuration. @public */
export const mobileEmployeeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    appearance: z
      .object({
        figure: z.enum(['dot', 'pebble', 'arch', 'kite', 'sprout']),
        color: z.enum(['coral', 'mint', 'blue', 'violet', 'gold', 'rose']),
        accessories: z
          .array(z.enum(['glasses', 'headphones', 'badge']))
          .max(3)
          .refine((items) => new Set(items).size === items.length),
        image: z
          .string()
          .max(1400000)
          .regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/u)
          .optional(),
      })
      .optional(),
    state: z.enum([
      'idle',
      'queued',
      'working',
      'needs-input',
      'paused',
      'blocked',
      'completed',
      'failed',
      'stale',
    ]),
    workItemIds: z.array(z.string()).readonly(),
    activeRole: z.string().min(1).max(128).optional(),
    lastKnownAt: z.string().optional(),
  })
  .strict();
