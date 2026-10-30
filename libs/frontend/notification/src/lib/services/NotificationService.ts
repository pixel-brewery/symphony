// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import type { INotificationInterceptor } from '../interception/INotificationInterceptor';
import type { INotificationMessage } from '../models/INotificationMessage';
import { NOTIFICATION_INTERCEPTORS } from '../provider/NotificationInterceptors';

// #endregion

@Injectable()
export class NotificationService {
  // #region Fields

  private readonly _interceptors: readonly INotificationInterceptor[];

  // #endregion

  // #region Ctor

  /**
   * Constructs the notification dispatcher from all registered interceptors.
   *
   * @public
   */
  public constructor(
    @Inject(NOTIFICATION_INTERCEPTORS)
    @Optional()
    interceptors: readonly INotificationInterceptor[] = inject(NOTIFICATION_INTERCEPTORS, {
      optional: true,
    }) ?? [],
  ) {
    this._interceptors = interceptors;
  }

  // #endregion

  // #region Methods

  /**
   * Shows the info.
   *
   * @param title - Title.
   * @param content - Content.
   * @public
   */
  public showInfo(title: string, content = ''): void {
    this.push({ kind: 'info', title, content });
  }

  /**
   * Shows the warning.
   *
   * @param title - Title.
   * @param content - Content.
   * @public
   */
  public showWarning(title: string, content = ''): void {
    this.push({ kind: 'warning', title, content });
  }

  /**
   * Shows the error.
   *
   * @param title - Title.
   * @param content - Content.
   * @public
   */
  public showError(title: string, content = ''): void {
    this.push({ kind: 'error', title, content });
  }

  /**
   * Shows the success.
   *
   * @param title - Title.
   * @param content - Content.
   * @public
   */
  public showSuccess(title: string, content = ''): void {
    this.push({ kind: 'success', title, content });
  }

  /**
   * Pushes.
   *
   * @param notification - Notification.
   * @public
   */
  public push(notification: INotificationMessage): void {
    for (const interceptor of this._interceptors) interceptor.push(notification);
  }

  // #endregion
}
