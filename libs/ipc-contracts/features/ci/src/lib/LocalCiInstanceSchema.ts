// #region Imports

import { z } from 'zod';

// #endregion

/** One managed Lima machine that currently occupies disk under the runner data root. */
export const localCiInstanceSchema = z.object({
  name: z.string().min(1),
  purpose: z.enum(['workflow-runner', 'legacy']),
  status: z.enum(['running', 'stopped', 'unknown', 'missing']),
  allocatedBytes: z.number().int().nonnegative(),
  provisionedDiskGiB: z.number().int().positive().optional(),
  createdAt: z.iso.datetime().optional(),
  /** Whether warm reuse keeps this machine on purpose instead of cleanup removing it. */
  keptWarm: z.boolean(),
  /** Whether a run is using the machine right now, which blocks removal. */
  busy: z.boolean(),
});
