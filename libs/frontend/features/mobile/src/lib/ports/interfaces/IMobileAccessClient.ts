// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { MobileAccessRequestMethod } from '../MobileAccessRequestMethod';

// #endregion

/**
 * Validated desktop request capability consumed by Mobile access.
 *
 * @public
 */
export interface IMobileAccessClient {
  /**
   * Dispatches one named local desktop request through its canonical validated contract.
   * @param method - Exact allowlisted mobile administration method.
   * @param payload - Payload validated by that method's owning desktop schema.
   * @returns The corresponding validated response for the selected administration method.
   */
  request<M extends MobileAccessRequestMethod>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
