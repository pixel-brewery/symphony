// #region Imports

import type { Signal } from '@angular/core';
import type { IViewSlotDefinition } from '@pixel-brewery/mosaik-elements-angular';
import type { IWidgetTile } from './IWidgetTile';
import type { IWidgetTilePlacement } from './IWidgetTilePlacement';

// #endregion

/** Feature-owned category metadata and data attached to a native Mosaik view definition. @public */
export interface IWidgetDefinition extends IViewSlotDefinition {
  readonly order: number;
  readonly label: string;
  readonly testId: string;
  readonly tilesTestId: string;
  readonly empty: string;
  readonly tiles: Signal<readonly IWidgetTile[]>;
  readonly placements: readonly IWidgetTilePlacement[];
}
