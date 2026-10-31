// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Work items a runner is holding right now: their newest execution is running, or is waiting to
 * resume with the run still owned by the runner.
 *
 * Queued runs are deliberately outside the set - a queued step waits for a free slot and nobody
 * is working on it yet - and that is exactly where the board's own card spinner draws the line
 * (`TaskRuntimePresentationPipe` reports `isRunning` for `running` and `waiting` only). Home and
 * board therefore agree: a home tile reports progress for precisely the columns whose cards spin.
 *
 * Only the execution's own `workItemId` counts, again mirroring the board, so a grouped delivery
 * marks its root rather than every member the group happens to carry.
 */
export function workItemIdsInProgress(
  items: readonly IWorkItem[],
  executions: readonly IExecutionRecord[],
): ReadonlySet<string> {
  const latestByWorkItem = new Map<string, IExecutionRecord>();
  for (const execution of executions) {
    const current = latestByWorkItem.get(execution.workItemId);
    if (!current || current.startedAt.localeCompare(execution.startedAt) < 0) {
      latestByWorkItem.set(execution.workItemId, execution);
    }
  }

  const ids = new Set<string>();
  for (const item of items) {
    const state = latestByWorkItem.get(item.id)?.state;
    if (state === 'running' || state === 'waiting') ids.add(item.id);
  }
  return ids;
}
