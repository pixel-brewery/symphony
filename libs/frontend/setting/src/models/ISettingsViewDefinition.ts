// #region Imports

import type { IViewSlotDefinition } from '@pixel-brewery/mosaik-elements-angular';
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
}
