// #region Imports

import type { IDeliveryProjectionValue } from './IDeliveryProjectionValue';

// #endregion

/** Applies only the projection fields changed by actual Delivery operations. @public */
export interface IDeliveryProjection {
  update(
    update: (value: IDeliveryProjectionValue | undefined) => IDeliveryProjectionValue | undefined,
  ): void;
}
