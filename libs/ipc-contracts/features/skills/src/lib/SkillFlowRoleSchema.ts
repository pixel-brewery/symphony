// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Validates the established skill assignment flow roles.
 *
 * @public
 */
export const skillFlowRoleSchema = z.enum([
  'work-item-creation',
  'analysis',
  'solution',
  'ci-diagnosis',
  'ci-repair',
  'pull-request-review',
]);
