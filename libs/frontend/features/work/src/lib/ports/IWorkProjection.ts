// #region Imports

import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Applies mutation results through the existing aggregate snapshot owner.
 *
 * @public
 */
export interface IWorkProjection {
  /** Replaces a known item without adding an absent card. @public */
  replaceItem(item: IWorkItem): void;
  /** Preserves an existing card's position or appends a newly created card. @public */
  upsertItem(item: IWorkItem): void;
}
