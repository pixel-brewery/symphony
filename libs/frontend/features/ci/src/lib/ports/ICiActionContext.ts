// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { ICiAgentExecution } from './ICiAgentExecution';

// #endregion

/** Readonly run, execution and repository facts consumed by the Actions screen and drawer. @public */
export interface ICiActionContext {
  readonly snapshot: Signal<
    | {
        readonly ciRuns?: readonly ICiRun[];
        readonly localCiExecutions?: readonly ILocalCiExecution[];
        readonly executions?: readonly ICiAgentExecution[];
      }
    | undefined
  >;
  readonly settings: Signal<
    | (Pick<ApplicationSettingsDto, 'repositoryBindings'> &
        Partial<Pick<ApplicationSettingsDto, 'agentProfiles' | 'runtime'>>)
    | undefined
  >;
}
