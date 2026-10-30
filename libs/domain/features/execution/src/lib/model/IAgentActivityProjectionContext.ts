// #region Imports

import type { IExecutionQueueEntry } from './IExecutionQueueEntry';
import type { IExecutionRecord } from './IExecutionRecord';
import type { IGoalRecord } from './IGoalRecord';

// #endregion

/**
 * Supplies the execution-owned evidence used to project an employee's actual activity.
 *
 * @public
 */
export interface IAgentActivityProjectionContext {
  /** Executions observed in the current workspace scope. */
  readonly executions: readonly IExecutionRecord[];
  /** Goal ownership and blocked-state evidence, when available. */
  readonly goals?: readonly IGoalRecord[];
  /** Accepted queue intents, when available. */
  readonly executionQueue?: readonly IExecutionQueueEntry[];
}
