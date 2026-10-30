// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { IExecutionEvent } from '@symphony/domain-execution';
import type { ExecutionRequestMethod } from './ExecutionRequestMethod';

// #endregion

/** Typed IPC requests and event stream consumed by Execution. @public */
export interface IExecutionClient {
  request<M extends ExecutionRequestMethod>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
  onExecutionEvent(listener: (event: IExecutionEvent) => void): () => void;
}
