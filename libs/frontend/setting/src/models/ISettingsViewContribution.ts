// #region Imports

import type { ISettingsViewDefinition } from './ISettingsViewDefinition';

// #endregion

/**
 * Configures one feature's cards without introducing a second runtime view registry.
 *
 * @public
 */
export interface ISettingsViewContribution {
  /**
   * Unique feature contribution identifier.
   *
   * @public
   * @readonly
   */
  readonly id: string;
  /**
   * Native Mosaik slot receiving the cards.
   *
   * @public
   * @readonly
   */
  readonly slot: string;
  /**
   * Feature-owned native card definitions.
   *
   * @public
   * @readonly
   */
  readonly views: readonly ISettingsViewDefinition[];
}
