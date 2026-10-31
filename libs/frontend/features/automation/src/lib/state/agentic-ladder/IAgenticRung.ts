// #region Imports

import type { AgenticSwitch } from './AgenticSwitch';

// #endregion

/**
 * One switch on the `Fix failed checks` rail with the switches it depends on.
 *
 * @public
 */
export interface IAgenticRung {
  /**
   * The policy switch.
   *
   * @public
   * @readonly
   */
  readonly key: AgenticSwitch;
  /**
   * Every switch that must be on before this one works.
   *
   * @public
   * @readonly
   */
  readonly requires: readonly AgenticSwitch[];
  /**
   * Switches of which at least one must be on before this one works.
   *
   * @public
   * @readonly
   */
  readonly requiresAnyOf: readonly AgenticSwitch[];
}
