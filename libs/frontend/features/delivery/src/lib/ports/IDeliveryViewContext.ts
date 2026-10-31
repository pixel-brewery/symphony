// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';

// #endregion

/** The readonly Delivery facts consumed by its list, authoring and contributed views. @public */
export interface IDeliveryViewContext {
  readonly snapshot: Signal<
    | {
        readonly pullRequests?: readonly IPullRequestSummary[];
        readonly ciRuns?: readonly ICiRun[];
        readonly localCiExecutions?: readonly ILocalCiExecution[];
        readonly remoteData?: { readonly pullRequests?: IRemoteDataStatus };
        /** Executions that link a pull request to the work item and agent behind it. */
        readonly executions?: readonly IExecutionRecord[];
        /** Work items whose tracker keys the pull-request list shows. */
        readonly workItems?: IOrchestrationSnapshot['workItems'];
      }
    | undefined
  >;
  readonly settings: Signal<
    | (Pick<ApplicationSettingsDto, 'repositoryBindings'> &
        Partial<Pick<ApplicationSettingsDto, 'agentProfiles' | 'ciBindings' | 'runtime'>>)
    | undefined
  >;
  readonly selectedWorkspaceIds: Signal<readonly string[]>;
  readonly canCreatePullRequest: Signal<boolean>;
}
