// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryRepositoryRuntime } from './IDeliveryRepositoryRuntime';

// #endregion

/** Binds Delivery's consumed DeliveryRepositoryRuntime contract to its existing owner. @public */
export const DELIVERY_REPOSITORY_RUNTIME = new InjectionToken<IDeliveryRepositoryRuntime | null>(
  'DELIVERY_REPOSITORY_RUNTIME',
);
