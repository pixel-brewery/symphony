// #region Imports

import type { ISettingsWorkspaceSelection } from '../context/ISettingsWorkspaceSelection';

// #endregion

/**
 * Gives native Services fragments the host workspace and optional current account row.
 *
 * @public
 */
export interface ISettingsServiceSelection extends ISettingsWorkspaceSelection {
  /** Stable account identifier when the host renders one configured-account row. @public @readonly */
  readonly connectionId?: string;
  /** Provider-neutral connection kind used by each owning feature's activation predicate. @public @readonly */
  readonly connectionKind?: string;
}
