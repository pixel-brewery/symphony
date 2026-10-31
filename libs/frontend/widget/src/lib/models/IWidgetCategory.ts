// #region Imports

import type { IQuickCreateItem } from '@symphony/frontend-quick-create';
import type { IWidgetTileSlot } from './IWidgetTileSlot';

// #endregion

export interface IWidgetCategory {
  readonly id: string;
  readonly label: string;
  readonly testId: string;
  /** Test id of the tile track, kept per category so an established contract survives. */
  readonly tilesTestId: string;
  /** Ten stable presentation slots following the original Quick Play geometry. */
  readonly slots: readonly IWidgetTileSlot[];
  readonly isEmpty: boolean;
  /** Sentence shown inside the retained mosaic while the category has nothing to show. */
  readonly empty: string;
  /** The category's authoring action, where the owning view has one. */
  readonly action?: IQuickCreateItem;
}
