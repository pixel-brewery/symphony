// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { NOTIFICATION_INTERCEPTORS } from './NotificationInterceptors';
import { NotificationService } from '../services/NotificationService';
import { ToastNotificationInterceptor } from '../interception/ToastNotificationInterceptor';

// #endregion

export function provideNotifications(): EnvironmentProviders {
  return makeEnvironmentProviders([
    NotificationService,
    ToastNotificationInterceptor,
    {
      provide: NOTIFICATION_INTERCEPTORS,
      useExisting: ToastNotificationInterceptor,
      multi: true,
    },
  ]);
}
