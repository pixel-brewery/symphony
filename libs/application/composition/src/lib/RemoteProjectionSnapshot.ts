// #region Imports

import type { IBoardColumn, IWorkItem, ProjectFieldDefinition } from '@symphony/domain-work';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/** Provider-neutral remote fields consumed by orchestration snapshot composition. */
export type RemoteProjectionSnapshot = {
  workItems: readonly IWorkItem[];
  projectFields?: readonly ProjectFieldDefinition[];
  boardColumns: readonly IBoardColumn[];
  pullRequests?: readonly IPullRequestSummary[];
  ciWorkflows?: readonly ICiWorkflow[];
  ciRuns?: readonly ICiRun[];
  remoteData?: {
    workItems: IRemoteDataStatus;
    pullRequests?: IRemoteDataStatus;
    ciRuns?: IRemoteDataStatus;
  };
};
