// #region Imports

import type { IBoardColumn, IWorkItem, IWorkItemEditorMetadata } from '@symphony/domain-work';

// #endregion

/** Provider reads required to assemble one complete work-tracking projection. */
export interface IWorkTrackingProjectionPort {
  listWorkItems(): Promise<readonly IWorkItem[]>;
  loadWorkItemDetails?(workItem: IWorkItem): Promise<IWorkItem>;
  listBoardColumns?(): Promise<readonly IBoardColumn[]>;
  listProjectFields?(): Promise<IWorkItemEditorMetadata['projectFields']>;
}
