// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliveryCiOperations } from './IDeliveryCiOperations';

// #endregion

/** Connects Delivery to the existing CI owner when that feature is selected. @public */
export const DELIVERY_CI_OPERATIONS = new InjectionToken<IDeliveryCiOperations | null>(
  'DELIVERY_CI_OPERATIONS',
);
