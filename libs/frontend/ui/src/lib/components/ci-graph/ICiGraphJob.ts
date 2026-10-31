// #region Imports

import type { CiRunLogState, ICiRunJob, ICiWorkflowJob } from '@symphony/domain-ci';

// #endregion

/** A definition job with its actual executions, independent of diagram geometry. */
export interface ICiGraphJob {
  readonly definition: ICiWorkflowJob;
  readonly executions: readonly ICiRunJob[];
  readonly status: CiRunLogState | undefined;
  readonly unresolved: boolean;
}
