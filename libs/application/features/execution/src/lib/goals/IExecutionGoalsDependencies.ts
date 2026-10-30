// #region Imports

import type {
  IExecutionRecord,
  IDeliveryGroup,
  IGoalRecord,
  IGoalReviewDecision,
} from '@symphony/domain-execution';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionGoalService. @public */
export interface IExecutionGoalsDependencies {
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'listGoals' | 'saveGoal'
  >;
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadWorkItemDetails'
  >;
  readonly goalAssignmentFor?: IAnalyzerDependencies['goalAssignmentFor'];
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly bindingSnapshotFor?: IAnalyzerDependencies['bindingSnapshotFor'];
  readonly positionPolicyFor?: IAnalyzerDependencies['positionPolicyFor'];
  publishAcceptanceNote(goal: IGoalRecord, review: IGoalReviewDecision): Promise<void>;
  activeDeliveryGroupForRoot(workItemId: string): IDeliveryGroup | undefined;
  latestExecution(executionId: string): IExecutionRecord;
}
