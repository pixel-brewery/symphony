// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

/** Commands exposed by the single manual owner. @public */
export interface IManualExecutions {
  completeManualAnalysis(workItemId: string, summary: string): Promise<IExecutionRecord>;
  completeManualSolution(workItemId: string, summary: string): Promise<IExecutionRecord>;
}
