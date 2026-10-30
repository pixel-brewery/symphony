// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Restricts Work's client to its consumed item and drafting operations.
 *
 * @public
 */
export interface IWorkClient {
  /** Invokes a canonical validated Work method. @public */
  request<
    M extends
      | 'work-items.detail'
      | 'work-items.metadata'
      | 'work-items.create'
      | 'work-items.update'
      | 'work-items.comment'
      | 'work-items.move'
      | 'work-items.draft'
      | 'work-items.draft.cancel',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
