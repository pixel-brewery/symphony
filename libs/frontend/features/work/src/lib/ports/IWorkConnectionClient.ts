// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** Only the canonical validated methods used by source-account operations. @public */
export interface IWorkConnectionClient {
  request<
    M extends
      | 'github.projects.list'
      | 'work-item-sources.columns'
      | 'azure-devops.login.start'
      | 'azure-devops.logout'
      | 'github.login.start'
      | 'github.logout'
      | 'connections.get',
  >(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
