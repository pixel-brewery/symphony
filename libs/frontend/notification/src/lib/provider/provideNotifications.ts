// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { NOTIFICATION_INTERCEPTORS } from './NotificationInterceptors';
import { NotificationService } from '../services/NotificationService';
import { ToastNotificationInterceptor } from '../interception/ToastNotificationInterceptor';
import { NotificationHistory } from '../state/NotificationHistory';

// #endregion

/**
 * Registers notifications for a window: toasts, and today's notice history that the
 * notification centre (a root service gathering the sources contributed with
 * `withNotificationSources`) shows beside the problems.
 *
 * @returns The window's notification providers.
 * @public
 */
export function provideNotifications(): EnvironmentProviders {
  return makeEnvironmentProviders([
    NotificationService,
    ToastNotificationInterceptor,
    {
      provide: NOTIFICATION_INTERCEPTORS,
      useExisting: ToastNotificationInterceptor,
      multi: true,
    },
    {
      provide: NOTIFICATION_INTERCEPTORS,
      useExisting: NotificationHistory,
      multi: true,
    },
  ]);
}
