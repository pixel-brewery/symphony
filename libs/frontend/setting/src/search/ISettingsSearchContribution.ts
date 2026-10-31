// #region Imports

import type { Signal } from '@angular/core';
import type { ISettingsSearchEntry } from './ISettingsSearchEntry';

// #endregion

/**
 * Data-dependent settings that one feature adds to a section another feature draws, for example
 * the AI accounts, boards or feedback intakes listed in `Connected services`.
 *
 * @public
 */
export interface ISettingsSearchContribution {
  /**
   * Unique contribution identifier.
   *
   * @public
   * @readonly
   */
  readonly id: string;
  /**
   * The section the entries live in, for example `services`.
   *
   * @public
   * @readonly
   */
  readonly sectionId: string;
  /**
   * Called once in an injection context, so it may `inject()` the feature's state; the returned
   * signal is read whenever the search runs.
   *
   * @public
   * @readonly
   */
  readonly searchEntries: () => Signal<readonly ISettingsSearchEntry[]>;
}
