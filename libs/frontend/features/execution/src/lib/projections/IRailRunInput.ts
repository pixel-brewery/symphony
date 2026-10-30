// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type {
  IExecutionEvent,
  IExecutionQueueEntry,
  IExecutionRecord,
} from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IActiveLocalCiRun } from './IActiveLocalCiRun';

// #endregion

export interface IRailRunInput {
  readonly executions: readonly IExecutionRecord[];
  readonly executionQueue: readonly IExecutionQueueEntry[];
  readonly events: readonly IExecutionEvent[];
  readonly workItems: readonly IWorkItem[];
  readonly ciRuns: readonly ICiRun[];
  readonly localCiExecutions: readonly ILocalCiExecution[];
  readonly repositoryNames: Readonly<Record<string, string>>;
  readonly activeLocalCiRun?: IActiveLocalCiRun;
}
