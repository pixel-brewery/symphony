// #region Imports

import type { PaletteResultAction } from './PaletteResultAction';
import type { PaletteResultGroup } from './PaletteResultGroup';

// #endregion

/**
 * One row of the command palette, projected by the feature that owns its data.
 *
 * @public
 */
export interface IPaletteResult {
  /** Stable identity, unique across every feature, such as `work-item:<id>`. @public @readonly */
  readonly id: string;
  /** Group the row is listed under. @public @readonly */
  readonly group: PaletteResultGroup;
  /** Registered icon name shown at the leading edge. @public @readonly */
  readonly icon: string;
  /** Optional identifier shown before the title, such as `CR-0589` or `#712`. @public @readonly */
  readonly reference?: string;
  /** The row's name: a work-item or pull-request title, or a command label. @public @readonly */
  readonly title: string;
  /**
   * Short facts shown on the second line, joined with ` · `, such as the board column and what the
   * item waits for. Omitted or empty for a single-line row.
   *
   * @public
   * @readonly
   */
  readonly facts?: readonly string[];
  /**
   * Key that triggers the same command together with the platform's primary modifier (⌘ on macOS,
   * Ctrl elsewhere), shown at the trailing edge. Only set for a shortcut that really works.
   *
   * @public
   * @readonly
   */
  readonly shortcut?: string;
  /**
   * Match quality for the current query; higher ranks first within the group. Results of an empty
   * query use `0` and keep their contribution order.
   *
   * @public
   * @readonly
   */
  readonly rank: number;
  /** What opening the row does. @public @readonly */
  readonly action: PaletteResultAction;
}
