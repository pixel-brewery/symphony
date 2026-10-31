// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryViewContext } from './IDeliveryViewContext';

// #endregion

/** Connects Delivery views to their existing readonly application projection. @public */
export const DELIVERY_VIEW_CONTEXT = new InjectionToken<IDeliveryViewContext>(
  'DELIVERY_VIEW_CONTEXT',
);
