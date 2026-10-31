// #region Imports

import type {
  IExecutionRecord,
  IGoalRecord,
  IGoalReviewDecision,
} from '@symphony/domain-execution';
import type { IWorkItem, IWorkItemNote } from '@symphony/domain-work';

// #endregion

/** Commands exposed by the single publication owner. @public */
export interface IExecutionPublication {
  publishPullRequest(executionId: string): Promise<IExecutionRecord>;
  publishAcceptanceNote(goal: IGoalRecord, review: IGoalReviewDecision): Promise<void>;
  publishNote(item: IWorkItem, executionId: string | undefined, note: IWorkItemNote): Promise<void>;
  implementationNote(execution: IExecutionRecord, summary: string): IWorkItemNote;
}
