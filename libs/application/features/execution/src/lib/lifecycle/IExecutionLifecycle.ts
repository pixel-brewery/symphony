// #region Imports

import type { ExecutionState, IExecutionRecord } from '@symphony/domain-execution';
import { AgentInterruptionError } from '@symphony/application-ai';

// #endregion

/** Commands exposed by the single lifecycle owner. @public */
export interface IExecutionLifecycle {
  activeExecutionRecords(): readonly IExecutionRecord[];
  cancelActiveExecutions(): Promise<readonly IExecutionRecord[]>;
  pauseActiveExecutions(): Promise<readonly IExecutionRecord[]>;
  pauseExecution(executionId: string): Promise<IExecutionRecord>;
  resumeExecution(executionId: string): Promise<IExecutionRecord>;
  reconcileActiveExecutions(): Promise<number>;
  recoverInterruptedExecutions(): Promise<void>;
  reactivateInterruptedExecutions(): Promise<number>;
  cancelExecution(executionId: string): Promise<IExecutionRecord>;
  isActive(state: ExecutionState): boolean;
  latestExecution(executionId: string): IExecutionRecord;
  launchExecution(executionId: string, run: (signal: AbortSignal) => Promise<void>): void;
  finishAbortedExecution(execution: IExecutionRecord): Promise<void>;
  waitForReactivation(
    execution: IExecutionRecord,
    cause: AgentInterruptionError,
    signal: AbortSignal,
  ): Promise<IExecutionRecord | undefined>;
  finishFailedExecution(
    execution: IExecutionRecord,
    cause: unknown,
    fallback: string,
  ): Promise<void>;
}
