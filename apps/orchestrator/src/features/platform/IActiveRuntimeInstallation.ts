// #region Imports
import { type IActiveOperation } from '../../composition/IActiveOperation';
// #endregion
/**
 * Exposes the active dependency installation to lifecycle commands.
 *
 * @public
 */
export interface IActiveRuntimeInstallation extends IActiveOperation {
  readonly command: 'git' | 'gh' | 'codex' | 'claude' | 'opencode';
}
