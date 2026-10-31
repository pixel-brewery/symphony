// #region Imports

import type { IExecutionRecord } from './IExecutionRecord';

// #endregion

/**
 * Whether the execution is a completed analysis the implementation step can consume.
 *
 * The implementation step is started from the newest analysis *summary*, so a succeeded run
 * without one is no more usable than a failed run. Supporting flows (CI diagnosis, CI repair,
 * pull-request review) also record `kind: 'analysis'` and are excluded by their flow role;
 * records written before the flow role existed were always the analysis flow.
 */
export function isCompletedAnalysis(execution: IExecutionRecord): boolean {
  return (
    (execution.kind === undefined || execution.kind === 'analysis') &&
    (execution.skillFlowRole === undefined || execution.skillFlowRole === 'analysis') &&
    execution.state === 'succeeded' &&
    Boolean(execution.summary?.trim())
  );
}
