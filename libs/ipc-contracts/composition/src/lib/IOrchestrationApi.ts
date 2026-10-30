// #region Imports

import type { ExecutionEventDto } from '@symphony/ipc-contracts-execution';
import type { PathSelectionRequest, PathSelectionResponse } from '@symphony/ipc-contracts-desktop';
import type { RequestMethod } from './RequestMethod';
import type { RequestPayload } from './RequestPayload';
import type { ResponsePayload } from './ResponsePayload';

// #endregion

export interface IOrchestrationApi {
  request<M extends RequestMethod>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>>;
  selectPath(request: PathSelectionRequest): Promise<PathSelectionResponse>;
  onExecutionEvent(listener: (event: ExecutionEventDto) => void): () => void;
}
