// #region Imports

import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IWorkItemComment } from '@symphony/domain-work';
import type { IWorkItemActivityEntry } from './IWorkItemActivityEntry';

// #endregion

/**
 * Merges a work item's opening, its run events and its discussion into one activity, newest
 * first.
 *
 * @param createdAt - When the provider opened the item, if known.
 * @param events - Run events to show.
 * @param comments - Provider comments.
 * @returns The entries, newest first.
 * @public
 */
export function resolveWorkItemActivity(
  createdAt: string | undefined,
  events: readonly IExecutionEvent[],
  comments: readonly IWorkItemComment[],
): readonly IWorkItemActivityEntry[] {
  const entries: IWorkItemActivityEntry[] = [
    ...events.map((event): IWorkItemActivityEntry => ({
      id: `event:${event.id}`,
      kind: 'event',
      at: event.occurredAt,
      event,
    })),
    ...comments.map((comment): IWorkItemActivityEntry => ({
      id: `comment:${comment.id}`,
      kind: 'comment',
      at: comment.createdAt,
      comment,
    })),
  ];
  if (createdAt) entries.push({ id: 'opened', kind: 'opened', at: createdAt });
  // Stable for equal instants: the order above (events, comments, opening) breaks ties.
  return entries
    .map((entry, index) => ({ entry, index }))
    .toSorted(
      (left, right) =>
        Date.parse(right.entry.at) - Date.parse(left.entry.at) || left.index - right.index,
    )
    .map(({ entry }) => entry);
}
