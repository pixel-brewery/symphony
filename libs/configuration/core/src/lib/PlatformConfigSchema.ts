// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Bootstrap description of the simulated target project used for a local first start. It
 * deliberately carries no workflow reference: the delivery process is installation
 * configuration and may be renamed, so a constant here could only ever go stale.
 */
export const platformConfigSchema = z.object({
  version: z.literal(1),
  targetProjects: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      tracker: z.object({ provider: z.literal('simulated'), project: z.string().min(1) }),
      repository: z.object({ provider: z.literal('simulated'), name: z.string().min(1) }),
    }),
  ),
});
