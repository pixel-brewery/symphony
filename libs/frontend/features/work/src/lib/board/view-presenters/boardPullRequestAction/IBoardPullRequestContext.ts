// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestReference, IPullRequestSummary } from '@symphony/domain-delivery';

// #endregion

export interface IBoardPullRequestContext {
  readonly reference: IPullRequestReference;
  readonly summary?: IPullRequestSummary;
  readonly run?: ICiRun;
}
