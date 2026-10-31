// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** The five existing validated Delivery methods used by the Orbit query/launch adapter. @public */
export interface IDeliveryLaunchClient {
  request<
    M extends
      | 'delivery.refresh'
      | 'delivery.operations'
      | 'delivery.preview'
      | 'delivery.start'
      | 'delivery.reconcile',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
