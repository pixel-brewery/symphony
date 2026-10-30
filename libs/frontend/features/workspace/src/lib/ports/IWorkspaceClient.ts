// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Restricts workspace management to its existing validated transport operations.
 *
 * @public
 */
export interface IWorkspaceClient {
  /**
   * Invokes a consumed workspace operation with its canonical payload and response.
   *
   * @public
   */
  request<
    M extends
      | 'workspaces.clear'
      | 'workspaces.delete'
      | 'workspaces.export'
      | 'workspaces.import'
      | 'storage.status.get',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
