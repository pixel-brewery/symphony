// #region Imports

import type { IWorkItem } from '@symphony/domain-work';

// #endregion

export interface IWorkItemDetailProjection {
  readonly version: 1;
  readonly workspaceIds: readonly string[];
  readonly workItem: IWorkItem;
  readonly refreshedAt: string;
}
