// #region Imports

import { z } from 'zod';
import { feedbackIntakeSourceSchema } from '@symphony/configuration-feedback';

// #endregion

/**
 * Owns the validated feedback request payloads at the desktop boundary.
 *
 * @public
 */
export const feedbackRequestSchemas = {
  'feedback-intake.test': z.object({
    source: feedbackIntakeSourceSchema.extend({ credentialRef: z.string().trim().min(1) }),
  }),
} as const;
