// #region Imports
import { type IActiveOperation } from '../../composition/IActiveOperation';
// #endregion
/**
 * Exposes local-run lifecycle evidence without transferring ownership of its registry.
 *
 * @public
 */
export interface IActiveLocalCiRun extends IActiveOperation {
  readonly startedAt: string;
}
