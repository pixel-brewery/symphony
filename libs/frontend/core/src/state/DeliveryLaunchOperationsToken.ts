// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryLaunchOperations } from './IDeliveryLaunchOperations';

// #endregion

/** Binds optional Orbit launch/query consumers to the real Delivery owner. @public */
export const DELIVERY_LAUNCH_OPERATIONS = new InjectionToken<IDeliveryLaunchOperations>(
  'DELIVERY_LAUNCH_OPERATIONS',
);
