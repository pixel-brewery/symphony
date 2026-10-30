// #region Imports

import { InjectionToken } from '@angular/core';
import type { INotificationInterceptor } from '../interception/INotificationInterceptor';

// #endregion

export const NOTIFICATION_INTERCEPTORS = new InjectionToken<readonly INotificationInterceptor[]>(
  'NOTIFICATION_INTERCEPTORS',
);
