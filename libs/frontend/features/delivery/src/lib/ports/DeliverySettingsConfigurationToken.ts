// #region Imports

import { InjectionToken } from '@angular/core';
import type { IDeliverySettingsConfiguration } from './IDeliverySettingsConfiguration';

// #endregion

/** Binds Delivery's consumed DeliverySettingsConfiguration contract to its existing owner. @public */
export const DELIVERY_SETTINGS_CONFIGURATION = new InjectionToken<IDeliverySettingsConfiguration>(
  'DELIVERY_SETTINGS_CONFIGURATION',
);
