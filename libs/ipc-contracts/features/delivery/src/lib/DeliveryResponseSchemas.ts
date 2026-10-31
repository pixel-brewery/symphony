// #region Imports

import { deliveryLaunchPlanSchema } from './DeliveryLaunchPlanSchema';
import { deliveryOperationSchema } from './DeliveryOperationSchema';
import { deliverySnapshotSchema } from './DeliverySnapshotSchema';
import { z } from 'zod';
import { executionRecordSchema } from '@symphony/ipc-contracts-execution';
import { pullRequestBranchInventorySchema } from './PullRequestBranchInventorySchema';
import { pullRequestComparisonSchema } from './PullRequestComparisonSchema';
import { pullRequestSummarySchema } from './PullRequestSummarySchema';

// #endregion

/**
 * Owns the validated delivery response payloads at the desktop boundary.
 *
 * @public
 */
export const deliveryResponseSchemas = {
  'pull-request.publish': executionRecordSchema,
  'pull-request.branches': pullRequestBranchInventorySchema,
  'pull-request.compare': pullRequestComparisonSchema,
  'pull-request.create': pullRequestSummarySchema,
  'pull-request.update-branch': pullRequestSummarySchema,
  'delivery.refresh': deliverySnapshotSchema,
  'delivery.preview': deliveryLaunchPlanSchema,
  'delivery.start': deliveryOperationSchema,
  'delivery.operations': z.array(deliveryOperationSchema).max(10000).readonly(),
  'delivery.reconcile': deliveryOperationSchema,
} as const;
