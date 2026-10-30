// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkDeliveryGroupContext } from './IWorkDeliveryGroupContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_DELIVERY_GROUP_CONTEXT = new InjectionToken<IWorkDeliveryGroupContext>(
  'WORK_DELIVERY_GROUP_CONTEXT',
);
