// #region Imports

import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';

// #endregion

export type GroupClaimAdmission = {
  readonly item: IWorkItem;
  readonly claim?: IWorkItemClaim;
  readonly acquired: boolean;
};
