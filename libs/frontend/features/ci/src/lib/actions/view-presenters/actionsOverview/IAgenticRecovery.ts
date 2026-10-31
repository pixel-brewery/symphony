// #region Imports

import type { ICiAgentExecution } from '../../../ports/ICiAgentExecution';

// #endregion

/**
 * The agentic recovery Symphony ran for one failed run: its AI diagnosis and its repair.
 *
 * @public
 */
export interface IAgenticRecovery {
  /** The latest `ci-diagnosis` execution for the run. @public @readonly */
  readonly diagnosis?: ICiAgentExecution;
  /** The latest `ci-repair` execution for the run. @public @readonly */
  readonly repair?: ICiAgentExecution;
}
