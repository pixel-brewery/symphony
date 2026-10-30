// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** The validated desktop operations actually consumed by the current Delivery store. @public */
export interface IDeliveryClient {
  request<
    M extends
      | 'pull-request.branches'
      | 'pull-request.compare'
      | 'pull-request.create'
      | 'pull-request.update-branch'
      | 'pull-request.publish',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
