// #region Imports

import type { IExecutionQueueEntry, IExecutionRecord } from '@symphony/domain-execution';

// #endregion

/** What happened to a requested step: it runs now, or it waits for a slot. */
export type ExecutionAdmission =
  | { readonly outcome: 'started'; readonly execution: IExecutionRecord }
  | { readonly outcome: 'queued'; readonly entry: IExecutionQueueEntry };
