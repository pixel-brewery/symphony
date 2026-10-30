// #region Imports

import { executionSchema } from '@symphony/persistence-execution';
import { workflowSchema } from '@symphony/persistence-workflow';
import { automationSchema } from '@symphony/persistence-automation';

// #endregion

/**
 * Applies feature-owned schema contributions in the original operational initialization order.
 *
 * @public
 */
export const operationalSchemas: readonly string[] = [
  executionSchema.records,
  workflowSchema,
  executionSchema.events,
  automationSchema,
  executionSchema.deliveryState,
];
