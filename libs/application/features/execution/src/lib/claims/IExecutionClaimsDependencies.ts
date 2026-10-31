// #region Imports

import type {
  ExecutionState,
  IExecutionEvent,
  IExecutionRecord,
  IDeliveryGroup,
} from '@symphony/domain-execution';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionClaimService. @public */
export interface IExecutionClaimsDependencies {
  readonly coordination: Pick<
    NonNullable<IAnalyzerDependencies['coordination']>,
    | 'renewWorkItemClaim'
    | 'releaseAbandonedWorkItemClaims'
    | 'advanceWorkItemClaim'
    | 'coordinatesWorkItem'
    | 'releaseWorkItemClaim'
    | 'acquireWorkItemClaim'
  >;
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'listExecutions' | 'saveExecution'
  >;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  isActive(state: ExecutionState): boolean;
  latestExecution(executionId: string): IExecutionRecord;
  finishFailedExecution(
    execution: IExecutionRecord,
    cause: unknown,
    fallback: string,
  ): Promise<void>;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
  pauseDeliveryGroup(
    group: IDeliveryGroup,
    pauseReason: NonNullable<IDeliveryGroup['pauseReason']>,
  ): void;
}
