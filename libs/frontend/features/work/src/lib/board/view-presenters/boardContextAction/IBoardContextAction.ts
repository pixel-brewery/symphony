// #region Imports

import { type IWorkItemAction } from '@symphony/domain-work';
import type { BoardContextActionIcon } from './BoardContextActionIcon';

// #endregion

/**
 * One card menu entry: the step the stage offers, dressed for the board.
 *
 * The steps themselves come from the domain, so the card, the task drawer, and the mobile
 * companion always agree on what a stage offers; only icon and emphasis are decided here.
 */
export interface IBoardContextAction extends IWorkItemAction {
  readonly iconName: BoardContextActionIcon;
  readonly variant: 'highlight' | 'default' | 'danger' | 'success';
}
