// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryProjection } from './IDeliveryProjection';

// #endregion

/** The authoritative transport adapter consumed by Delivery result updates. @public */
export const DELIVERY_PROJECTION = new InjectionToken<IDeliveryProjection>('DELIVERY_PROJECTION');
