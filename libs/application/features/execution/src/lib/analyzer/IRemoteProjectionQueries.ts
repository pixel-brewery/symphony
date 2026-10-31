// #region Imports

import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/** Work Item reads and confirmed mutation feedback consumed by execution. @public */
export interface IRemoteProjectionQueries {
  loadOperationalWorkItems(): Promise<readonly IWorkItem[]>;
  loadWorkItemDetails(workItemId: string): Promise<IWorkItem>;
  recordWorkItem(workItem: IWorkItem): void;
}
