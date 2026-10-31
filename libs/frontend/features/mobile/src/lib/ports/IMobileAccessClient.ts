// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { MobileAccessRequestMethod } from './MobileAccessRequestMethod';

// #endregion

/**
 * Validated desktop request capability consumed by Mobile access.
 *
 * @public
 */
export interface IMobileAccessClient {
  request<M extends MobileAccessRequestMethod>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
