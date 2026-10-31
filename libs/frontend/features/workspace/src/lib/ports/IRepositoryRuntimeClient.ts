// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Validated repository preparation and verification requests consumed by Workspace.
 *
 * @public
 */
export interface IRepositoryRuntimeClient {
  request<
    M extends
      | 'repositories.runtime.list'
      | 'repositories.prepare'
      | 'verification.plan'
      | 'verification.run'
      | 'verification.cancel',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
