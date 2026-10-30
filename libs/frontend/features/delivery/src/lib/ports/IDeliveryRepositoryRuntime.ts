// #region Imports

import type { Signal } from '@angular/core';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** Only Workspace's actual repository preparation facts and command consumed by Delivery. @public */
export interface IDeliveryRepositoryRuntime {
  readonly repositoryRuntimeBusy: Signal<string | undefined>;
  repositoryRuntimeStatus(
    repositoryBindingId: string,
  ): ResponsePayload<'repositories.runtime.list'>[number] | undefined;
  prepareRepository(repositoryBindingId: string): Promise<boolean>;
}
