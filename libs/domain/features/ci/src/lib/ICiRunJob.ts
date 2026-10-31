// #region Imports

import type { CiRunLogState } from './CiRunLogState';
import type { ICiRunStep } from './ICiRunStep';

// #endregion

export interface ICiRunJob {
  id: string;
  workflowJobId?: string;
  name: string;
  status: CiRunLogState;
  startedAt?: string;
  finishedAt?: string;
  externalUrl?: string;
  steps: readonly ICiRunStep[];
}
