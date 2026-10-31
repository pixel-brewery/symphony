// #region Imports

import { configurationOperationSchema } from '@symphony/ipc-contracts-core';

// #endregion

/**
 * Owns the validated feedback response payloads at the desktop boundary.
 *
 * @public
 */
export const feedbackResponseSchemas = {
  'feedback-intake.test': configurationOperationSchema,
} as const;
