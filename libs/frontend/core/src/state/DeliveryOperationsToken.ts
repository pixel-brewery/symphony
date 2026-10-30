// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryOperations } from './IDeliveryOperations';

// #endregion

/** The single feature-owned Delivery operation and busy-state owner. @public */
export const DELIVERY_OPERATIONS = new InjectionToken<IDeliveryOperations>('DELIVERY_OPERATIONS');
