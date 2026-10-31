// #region Imports

import { repositoryTrustSchema } from '@symphony/persistence-workspace';
import { verificationSchema, localCiExecutionSchema } from '@symphony/persistence-ci';

// #endregion

/**
 * Applies the original trust, verification and local-CI schema order.
 *
 * @public
 */
export const runtimeSchemas: readonly string[] = [
  repositoryTrustSchema,
  verificationSchema,
  localCiExecutionSchema,
];
