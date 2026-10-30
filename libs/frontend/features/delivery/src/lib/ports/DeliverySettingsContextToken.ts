// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliverySettingsContext } from './IDeliverySettingsContext';

// #endregion

/** Binds Delivery's consumed DeliverySettingsContext contract to its existing owner. @public */
export const DELIVERY_SETTINGS_CONTEXT = new InjectionToken<IDeliverySettingsContext>(
  'DELIVERY_SETTINGS_CONTEXT',
);
