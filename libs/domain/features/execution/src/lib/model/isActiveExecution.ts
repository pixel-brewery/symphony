// #region Imports

import type { IExecutionRecord } from './IExecutionRecord';

// #endregion

/** Execution states in which work is still owned by a runner, so nothing new may be started. */
export function isActiveExecution(execution: IExecutionRecord): boolean {
  return (
    execution.state === 'queued' || execution.state === 'running' || execution.state === 'waiting'
  );
}
