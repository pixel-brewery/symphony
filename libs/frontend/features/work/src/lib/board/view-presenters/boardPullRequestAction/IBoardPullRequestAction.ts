// #region Imports

import type { BoardPullRequestActionId } from './BoardPullRequestActionId';

// #endregion

/**
 * One entry of the card's pull-request submenu.
 *
 * The set of entries is deliberately stable: a running workflow only changes an entry's label
 * and handler, it never removes one. Mosaik's popover submenu adopts appended children but marks
 * the parent childless once a projected child is removed, so a menu that swaps its entries while
 * it is open loses its submenu.
 */
export interface IBoardPullRequestAction {
  readonly id: BoardPullRequestActionId;
  readonly label: string;
  readonly subLabel?: string;
  readonly iconName: 'branch' | 'cloudArrowRight' | 'arrowRight' | 'clear';
  readonly variant: 'highlight' | 'default' | 'danger';
  /** Why the entry cannot run now. Shown instead of hiding the entry. */
  readonly blockedReason?: string;
  /** Workflow run the entry acts on; absent while no run is known for the branch. */
  readonly runId?: string;
  /** True when the entry stops a run rather than starting one. */
  readonly cancels: boolean;
}
