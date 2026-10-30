// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Validated native tool requests consumed by Platform.
 *
 * @public
 */
export interface IPlatformClient {
  request<
    M extends 'health.get' | 'runtime-dependencies.install' | 'external-services.incidents.get',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
