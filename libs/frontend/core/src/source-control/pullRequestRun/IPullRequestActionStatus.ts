// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

export interface IPullRequestActionStatus {
  readonly run: ICiRun;
  readonly source: 'cloud' | 'local';
  readonly state: ICiRun['status'];
  readonly active: boolean;
  readonly startedAt: string;
}
