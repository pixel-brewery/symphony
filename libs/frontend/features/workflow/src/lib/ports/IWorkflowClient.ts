// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { WorkflowRequestMethod } from './WorkflowRequestMethod';

// #endregion

/** Typed workflow requests consumed by the feature. @public */
export interface IWorkflowClient {
  request<M extends WorkflowRequestMethod>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
}
