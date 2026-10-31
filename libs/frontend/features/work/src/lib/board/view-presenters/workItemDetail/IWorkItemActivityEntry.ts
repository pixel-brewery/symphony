// #region Imports

import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IWorkItemComment } from '@symphony/domain-work';

// #endregion

/**
 * One entry of a work item's activity: the provider opening it, a run event, or a comment of
 * its discussion.
 *
 * @public
 */
export interface IWorkItemActivityEntry {
  readonly id: string;
  readonly kind: 'opened' | 'event' | 'comment';
  readonly at: string;
  readonly event?: IExecutionEvent;
  readonly comment?: IWorkItemComment;
}
