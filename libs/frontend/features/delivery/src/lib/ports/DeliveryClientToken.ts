// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryClient } from './IDeliveryClient';

// #endregion

/** The existing validated desktop API restricted to Delivery's actual requests. @public */
export const DELIVERY_CLIENT = new InjectionToken<IDeliveryClient>('DELIVERY_CLIENT');
