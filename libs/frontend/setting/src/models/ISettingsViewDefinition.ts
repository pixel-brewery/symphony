// #region Imports

import type { Signal } from '@angular/core';
import type { IViewSlotDefinition } from '@pixel-brewery/mosaik-elements-angular';
import type { ISettingsSearchEntry } from '../search/ISettingsSearchEntry';
import type { ISettingsSelection } from './ISettingsSelection';
import type { SettingsSection } from './SettingsSection';

// #endregion

/**
 * Adds feature-owned section metadata to the existing Mosaik view-slot contract.
 *
 * @public
 */
export interface ISettingsViewDefinition extends IViewSlotDefinition<ISettingsSelection> {
  /**
   * Section that owns this card's navigation entry.
   *
   * @public
   * @readonly
   */
  readonly section: SettingsSection;
  /**
   * The settings this card shows, for `Search settings`. Entries of a workspace section are
   * listed once for every workspace.
   *
   * @public
   * @readonly
   */
  readonly search?: readonly ISettingsSearchEntry[];
  /**
   * Settings that depend on data, such as one entry per connected service. Called once in an
   * injection context, so it may `inject()` the feature's state; the returned signal is read
   * whenever the search runs.
   *
   * @public
   * @readonly
   */
  readonly searchEntries?: () => Signal<readonly ISettingsSearchEntry[]>;
}
