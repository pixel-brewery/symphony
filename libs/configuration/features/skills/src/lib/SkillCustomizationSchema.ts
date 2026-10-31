// #region Imports

import { z } from 'zod';
import { processRoles } from '@symphony/domain-workflow';

// #endregion

/** Installation-owned addition to one built-in role. Roles themselves are not configurable. */
export const skillCustomizationSchema = z
  .object({
    role: z.enum(processRoles),
    additionalInstructions: z.string().max(20_000),
  })
  .strict();
