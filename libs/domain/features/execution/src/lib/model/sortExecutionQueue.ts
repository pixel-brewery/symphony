// #region Imports

import type { IExecutionQueueEntry } from './IExecutionQueueEntry';

// #endregion

/** Ordered oldest-first, which is the order the queue is drained in. */
export function sortExecutionQueue(
  entries: readonly IExecutionQueueEntry[],
): readonly IExecutionQueueEntry[] {
  return [...entries].sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}
