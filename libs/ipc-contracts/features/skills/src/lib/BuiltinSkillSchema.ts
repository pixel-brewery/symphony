// #region Imports

import { z } from 'zod';
import { processRoles } from '@symphony/domain-workflow';

// #endregion

/**
 * Validates a built-in process role projected to the settings surface.
 *
 * @public
 */
export const builtinSkillSchema = z.object({
  role: z.enum(processRoles),
  displayName: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  promptVersion: z.number().int().positive(),
  instructions: z.string(),
  mutatesWorkspace: z.boolean(),
  publishesPullRequest: z.boolean(),
  additionalInstructions: z.string(),
});
