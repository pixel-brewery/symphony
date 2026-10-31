// #region Imports

import type { Signal } from '@angular/core';
import type {
  IOrchestrationSnapshot,
  ApplicationSettingsDto,
} from '@symphony/ipc-contracts-composition';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/** Only the existing readonly facts consumed by this Work surface. @public */
export interface IWorkBoardContext {
  readonly snapshot: Signal<
    | Pick<
        IOrchestrationSnapshot,
        | 'workItems'
        | 'boardColumns'
        | 'projectFields'
        | 'remoteData'
        | 'executions'
        | 'workflow'
        | 'workItemReadiness'
        | 'deliveryGroups'
        | 'deliveryGroupProposals'
        | 'events'
        | 'pullRequests'
        | 'ciRuns'
      >
    | undefined
  >;
  readonly settings: Signal<
    | Pick<
        ApplicationSettingsDto,
        'workspaces' | 'activeViewScope' | 'connections' | 'agentProfiles'
      >
    | undefined
  >;
  readonly availableBoards: Signal<ApplicationSettingsDto['workItemSources']>;
  readonly activeBoard: Signal<ApplicationSettingsDto['workItemSources'][number] | undefined>;
  readonly scopedWorkItems: Signal<readonly IWorkItem[]>;
  readonly canCreateWorkItem: Signal<boolean>;
}
