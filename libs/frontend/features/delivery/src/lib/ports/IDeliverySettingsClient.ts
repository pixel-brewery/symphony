// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { PathSelectionRequest, PathSelectionResponse } from '@symphony/ipc-contracts-desktop';

// #endregion

/** Only the existing validated inspection and native picker consumed by Delivery forms. @public */
export interface IDeliverySettingsClient {
  request(
    method: 'setup.repository.inspect',
    payload: RequestPayload<'setup.repository.inspect'>,
  ): Promise<ResponsePayload<'setup.repository.inspect'>>;
  selectPath(options: PathSelectionRequest): Promise<PathSelectionResponse>;
}
