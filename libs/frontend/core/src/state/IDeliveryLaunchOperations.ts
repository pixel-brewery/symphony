// #region Imports

import type {
  IDeliveryLaunchPlan,
  IDeliveryOperation,
  IDeliverySnapshot,
} from '@symphony/domain-delivery';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** The existing Delivery queries and launch commands consumed by the Orbit surface. @public */
export interface IDeliveryLaunchOperations {
  refresh(): Promise<IDeliverySnapshot>;
  operations(): Promise<readonly IDeliveryOperation[]>;
  preview(request: RequestPayload<'delivery.preview'>): Promise<IDeliveryLaunchPlan>;
  start(request: RequestPayload<'delivery.start'>): Promise<IDeliveryOperation>;
  reconcile(operationId: string): Promise<IDeliveryOperation>;
}
