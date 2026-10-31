// #region Imports

import { deliveryGroupProposalSchema } from './DeliveryGroupProposalSchema';
import { deliveryGroupSchema } from './DeliveryGroupSchema';
import { executionAdmissionSchema } from './ExecutionAdmissionSchema';
import { executionQueueEntrySchema } from './ExecutionQueueEntrySchema';
import { executionRecordSchema } from './ExecutionRecordSchema';
import { executionRuntimeStateSchema } from './ExecutionRuntimeStateSchema';
import { goalRecordSchema } from './GoalRecordSchema';

// #endregion

/**
 * Owns the validated execution response payloads at the desktop boundary.
 *
 * @public
 */
export const executionResponseSchemas = {
  'execution-state.get': executionRuntimeStateSchema,
  'analyzer.start': executionAdmissionSchema,
  'analysis.complete-manually': executionRecordSchema,
  'solver.start': executionAdmissionSchema,
  'work-items.delegate': goalRecordSchema,
  'goals.review': goalRecordSchema,
  'delivery-groups.assess': deliveryGroupProposalSchema,
  'delivery-groups.create-direct': deliveryGroupSchema,
  'delivery-groups.confirm': deliveryGroupSchema,
  'delivery-groups.reject': deliveryGroupProposalSchema,
  'delivery-groups.dissolve': deliveryGroupSchema,
  'delivery-groups.align': deliveryGroupSchema,
  'solution.complete-manually': executionRecordSchema,
  'execution-queue.remove': executionQueueEntrySchema,
  'execution.cancel': executionRecordSchema,
  'execution.pause': executionRecordSchema,
  'execution.resume': executionRecordSchema,
} as const;
