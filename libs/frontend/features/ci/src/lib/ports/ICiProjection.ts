// #region Imports

import type { ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Applies typed CI results through the existing aggregate snapshot and storage owners.
 *
 * @public
 */
export interface ICiProjection {
  /** Applies one validated refresh result without replacing unrelated snapshot data. @public */
  applyRefresh(result: ResponsePayload<'ci.runs.refresh'>): void;
  /** Projects a dispatched run into the current aggregate. @public */
  prependRun(run: ResponsePayload<'ci.workflow.dispatch'>): void;
  /** Updates storage through its existing shared owner. @public */
  updateStorageStatus(status: ResponsePayload<'storage.status.get'>): void;
}
