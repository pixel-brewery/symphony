// #region Imports

import type { IPaletteResult } from './IPaletteResult';
import type { PaletteResultGroup } from './PaletteResultGroup';

// #endregion

/**
 * One group of the command palette with its ranked, limited rows.
 *
 * @public
 */
export interface IPaletteSection {
  /** Group the rows belong to. @public @readonly */
  readonly group: PaletteResultGroup;
  /** Rows in display order. @public @readonly */
  readonly results: readonly IPaletteResult[];
  /** Position of the section's first row in the palette's flat keyboard order. @public @readonly */
  readonly offset: number;
}
