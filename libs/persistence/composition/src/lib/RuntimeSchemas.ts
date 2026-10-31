// #region Imports

import { repositoryTrustSchema } from '@symphony/persistence-workspace';
import {
  ciRunHistorySchema,
  localCiExecutionSchema,
  verificationSchema,
} from '@symphony/persistence-ci';

// #endregion

/**
 * Applies the original trust, verification and local-CI schema order, then the run history.
 *
 * @public
 */
export const runtimeSchemas: readonly string[] = [
  repositoryTrustSchema,
  verificationSchema,
  localCiExecutionSchema,
  ciRunHistorySchema,
];
