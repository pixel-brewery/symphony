// #region Imports

import type { ICiOperations } from '@symphony/frontend-core';

// #endregion

/** The actual optional participant consumed by Work, without another state owner. @public */
export type IWorkCiOperations = Pick<
  ICiOperations,
  | 'localCiRunningRunId'
  | 'localCiEnabledFor'
  | 'refreshContinuousIntegrationRuns'
  | 'rerunCiRun'
  | 'runCiLocally'
  | 'cancelLocalCiRun'
  | 'cancelCiRun'
>;
