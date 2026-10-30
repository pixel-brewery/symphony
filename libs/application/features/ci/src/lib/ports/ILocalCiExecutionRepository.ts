// #region Imports

import type { ILocalCiExecution } from '@symphony/domain-ci';

// #endregion

/**
 * Retains bounded local CI evidence used by the current workspace run history.
 *
 * @public
 */
export interface ILocalCiExecutionRepository {
  /**
   * Retains bounded evidence from a terminal managed local-CI execution.
   *
   * @public
   */
  saveLocalCiExecution(execution: ILocalCiExecution): void;
  /**
   * Reads the newest retained terminal local-CI evidence.
   *
   * @public
   */
  listLocalCiExecutions(): readonly ILocalCiExecution[];
}
