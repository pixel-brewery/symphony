// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type {
  IDeliveryLaunchPlan,
  IDeliveryOperation,
  IDeliverySnapshot,
} from '@symphony/domain-delivery';
import type { IDeliveryLaunchOperations } from '@symphony/frontend-core/delivery-operations';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type { IDeliveryLaunchClient } from '../ports/IDeliveryLaunchClient';
import { DELIVERY_LAUNCH_CLIENT } from '../ports/DeliveryLaunchClientToken';

// #endregion

/** Owns the existing Delivery RPC dispatches without another state, cache or settings writer. @public */
@Injectable()
export class DeliveryLaunchOperations implements IDeliveryLaunchOperations {
  // #region Ctor
  /** Connects only the existing validated Delivery transport. @public */
  public constructor(
    @Inject(DELIVERY_LAUNCH_CLIENT)
    private readonly _client: IDeliveryLaunchClient = inject(DELIVERY_LAUNCH_CLIENT),
  ) {}
  // #endregion
  // #region Methods
  /** Reads the existing provider evidence without changing its request shape. @public */
  public refresh(): Promise<IDeliverySnapshot> {
    return this._client.request('delivery.refresh', {});
  }
  /** Reads the existing operation history. @public */
  public operations(): Promise<readonly IDeliveryOperation[]> {
    return this._client.request('delivery.operations', {});
  }
  /** Prepares the existing exact target/version proposal. @public */
  public preview(request: RequestPayload<'delivery.preview'>): Promise<IDeliveryLaunchPlan> {
    return this._client.request('delivery.preview', request);
  }
  /** Dispatches the reviewed proposal using its existing operation identity. @public */
  public start(request: RequestPayload<'delivery.start'>): Promise<IDeliveryOperation> {
    return this._client.request('delivery.start', request);
  }
  /** Reconciles one existing operation without another writable owner. @public */
  public reconcile(operationId: string): Promise<IDeliveryOperation> {
    return this._client.request('delivery.reconcile', { operationId });
  }
  // #endregion
}
