// #region Imports

import type { Signal } from '@angular/core';
import type {
  IOrchestrationSnapshot,
  ApplicationSettingsDto,
} from '@symphony/ipc-contracts-composition';

// #endregion

/** Only the existing readonly facts consumed by this Work surface. @public */
export interface IWorkTaskContext {
  readonly snapshot: Signal<
    | Pick<
        IOrchestrationSnapshot,
        | 'workItems'
        | 'goals'
        | 'executions'
        | 'events'
        | 'workflow'
        | 'boardColumns'
        | 'workItemReadiness'
        | 'projectFields'
      >
    | undefined
  >;
  readonly settings: Signal<
    | Pick<
        ApplicationSettingsDto,
        | 'agentTeams'
        | 'agentProfiles'
        | 'deliveryContexts'
        | 'workItemSources'
        | 'repositoryBindings'
      >
    | undefined
  >;
  readonly selectedWorkspaceIds: Signal<readonly string[]>;
  readonly activeWorkspace: Signal<{ readonly id: string } | undefined>;
  readonly creationBoard: Signal<{ readonly id: string; readonly workspaceId: string } | undefined>;
}
