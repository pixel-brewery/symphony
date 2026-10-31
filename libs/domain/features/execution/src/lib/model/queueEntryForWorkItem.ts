// #region Imports

import type { IExecutionQueueEntry } from './IExecutionQueueEntry';
import { sortExecutionQueue } from './sortExecutionQueue';

// #endregion

/** Whether a step for this work item is already waiting, so no second one may be accepted. */
export function queueEntryForWorkItem(
  entries: readonly IExecutionQueueEntry[],
  workItemId: string,
): IExecutionQueueEntry | undefined {
  return sortExecutionQueue(entries).find((entry) => entry.workItemId === workItemId);
}
