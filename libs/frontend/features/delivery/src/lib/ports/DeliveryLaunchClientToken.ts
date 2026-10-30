// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryLaunchClient } from './IDeliveryLaunchClient';

// #endregion

/** Supplies the existing validated transport to Delivery's launch/query adapter. @public */
export const DELIVERY_LAUNCH_CLIENT = new InjectionToken<IDeliveryLaunchClient>(
  'DELIVERY_LAUNCH_CLIENT',
);
