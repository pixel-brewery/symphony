// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** Readonly run and repository facts consumed by the CI Action drawer. @public */
export interface ICiActionContext {
  readonly snapshot: Signal<
    | {
        readonly ciRuns?: readonly ICiRun[];
        readonly localCiExecutions?: readonly ILocalCiExecution[];
      }
    | undefined
  >;
  readonly settings: Signal<Pick<ApplicationSettingsDto, 'repositoryBindings'> | undefined>;
}
