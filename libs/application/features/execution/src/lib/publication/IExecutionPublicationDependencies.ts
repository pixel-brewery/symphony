// #region Imports

import type { IExecutionEvent, IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';
import type { IPullRequestReference } from '@symphony/domain-delivery';

// #endregion

/** Capabilities consumed by ExecutionPublicationService. @public */
export interface IExecutionPublicationDependencies {
  readonly delivery?: Pick<NonNullable<IAnalyzerDependencies['delivery']>, 'publishPullRequest'>;
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'listExecutions' | 'saveExecution'
  >;
  readonly workspace: Pick<NonNullable<IAnalyzerDependencies['workspace']>, 'isAvailable'>;
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadOperationalWorkItems'
  >;
  readonly tracker: Pick<NonNullable<IAnalyzerDependencies['tracker']>, 'publishWorkItemNote'>;
  synchronizeDeliveryGroupPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    pullRequest: IPullRequestReference,
  ): Promise<void>;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
}
