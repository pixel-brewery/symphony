// #region Imports

import type { IQuickCreateItem } from './IQuickCreateItem';

// #endregion

/**
 * Supplies authoring actions from their current feature-owned availability projection.
 *
 * @public
 */
export interface IQuickCreateItemSource {
  getItems(): readonly IQuickCreateItem[];
}
