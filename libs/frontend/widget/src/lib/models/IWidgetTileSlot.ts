// #region Imports

import type { IWidgetTile } from './IWidgetTile';

// #endregion

export interface IWidgetTileSlot {
  /** Stable position in the ten-slot Quick Play mosaic. */
  readonly index: number;
  /** One-based column where this slot starts in the six-column fixed grid. */
  readonly column: number;
  /** One-based row where this slot starts in the four-row fixed grid. */
  readonly row: number;
  /** Number of columns occupied by this fixed mosaic slot. */
  readonly columns: 1 | 2;
  /** Number of rows occupied by this fixed mosaic slot. */
  readonly rows: 1 | 2;
  /** Changes only when the slot receives different content, so its entrance animation can replay. */
  readonly animationKey: string;
  /** Whether the current content is completing its exit before the slot order changes. */
  readonly isExiting: boolean;
  /** Registered Mosaik animation and optional completion handoff for this render phase. */
  readonly animation: Readonly<{ name: string; onFinished?: () => void }>;
  /** The category projection currently shown in this slot. */
  readonly tile?: IWidgetTile;
  /** The first five WPF-compatible slots keep a faint frame even without content. */
  readonly showsEmptyFrame: boolean;
}
