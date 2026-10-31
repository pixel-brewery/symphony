// #region Imports

import type { CiRunLogState } from './CiRunLogState';

// #endregion

export interface ICiRunStep {
  id: string;
  name: string;
  status: CiRunLogState;
  startedAt?: string;
  finishedAt?: string;
}
