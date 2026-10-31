// #region Imports

import type { Signal } from '@angular/core';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';

// #endregion

/** Only the existing readonly facts consumed by this Work surface. @public */
export interface IWorkDeliveryGroupContext {
  readonly snapshot: Signal<
    | Pick<IOrchestrationSnapshot, 'workItems' | 'deliveryGroups' | 'deliveryGroupProposals'>
    | undefined
  >;
}
