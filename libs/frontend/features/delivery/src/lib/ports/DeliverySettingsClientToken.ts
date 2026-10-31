// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliverySettingsClient } from './IDeliverySettingsClient';

// #endregion

/** Binds Delivery's consumed DeliverySettingsClient contract to its existing owner. @public */
export const DELIVERY_SETTINGS_CLIENT = new InjectionToken<IDeliverySettingsClient>(
  'DELIVERY_SETTINGS_CLIENT',
);
