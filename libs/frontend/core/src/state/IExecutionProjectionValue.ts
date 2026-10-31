// #region Imports

import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';

// #endregion

/** The transport projection fields consumed by Execution and its Work result updates. @public */
export type IExecutionProjectionValue = Pick<
  IOrchestrationSnapshot,
  | 'executions'
  | 'executionQueue'
  | 'events'
  | 'goals'
  | 'deliveryGroups'
  | 'deliveryGroupProposals'
  | 'workItems'
>;
