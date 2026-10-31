// #region Imports

import type { IExecutionOperations } from '@symphony/frontend-core/execution';

// #endregion

/** Only the Execution commands consumed by Work editing and board actions. @public */
export type IWorkExecution = Pick<
  IExecutionOperations,
  | 'publicationAvailable'
  | 'startAnalyzer'
  | 'delegateWorkItem'
  | 'reviewGoal'
  | 'assessDeliveryGroup'
  | 'groupDeliveryDirectly'
  | 'confirmDeliveryGroup'
  | 'rejectDeliveryGroup'
  | 'dissolveDeliveryGroup'
  | 'alignDeliveryGroup'
  | 'completeManualAnalysis'
  | 'startSolver'
  | 'completeManualSolution'
  | 'removeQueueEntry'
  | 'cancelExecution'
  | 'publishPullRequest'
>;
