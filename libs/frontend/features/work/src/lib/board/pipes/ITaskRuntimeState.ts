// #region Imports

import type { IExecutionEvent, IExecutionRecord } from '@symphony/domain-execution';

// #endregion

export interface ITaskRuntimeState {
  readonly execution: IExecutionRecord;
  readonly latestEvent?: IExecutionEvent;
}
