// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/** Commands exposed by the single run owner. @public */
export interface IExecutionRuns {
  isSemanticFailure(summary: string | undefined): boolean;
  completeAgenticDiagnosisInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  completeInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
  completeSolutionInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    analysis: string,
    feedback: string | undefined,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void>;
}
