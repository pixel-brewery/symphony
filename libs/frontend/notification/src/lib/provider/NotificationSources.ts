// #region Imports

import { InjectionToken } from '@angular/core';
import type { INotificationSource } from '../sources/INotificationSource';

// #endregion

/**
 * Multi-provider of the notification sources contributed by the included features.
 *
 * @public
 */
export const NOTIFICATION_SOURCES = new InjectionToken<readonly INotificationSource[]>(
  'NOTIFICATION_SOURCES',
);
