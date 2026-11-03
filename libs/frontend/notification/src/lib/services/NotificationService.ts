// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import type { INotificationInterceptor } from '../interception/INotificationInterceptor';
import type { INotificationMessage } from '../models/INotificationMessage';
import { NOTIFICATION_INTERCEPTORS } from '../provider/NotificationInterceptors';

// #endregion

const MAXIMUM_ERROR_GROUPS = 50;

@Injectable()
export class NotificationService {
  // #region Fields

  private readonly _interceptors: readonly INotificationInterceptor[];
  private readonly _errorGroups = new Map<string, string>();

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
   * @param groupKey - Stable owner and resource identifier for a persistent error.
   * @public
   */
  public showError(title: string, content = '', groupKey?: string): void {
    this.push({ kind: 'error', title, content, ...(groupKey ? { groupKey } : {}) });
  }

  /**
   * Allows an owned error to notify again after its owner confirms recovery.
   *
   * @param groupKey - The recovered owner and resource identifier.
   * @public
   */
  public resolveError(groupKey: string): void {
    this._errorGroups.delete(groupKey);
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
    let repeated = false;
    if (notification.kind === 'error' && notification.groupKey) {
      const fingerprint = JSON.stringify([notification.title, notification.content]);
      repeated = this._errorGroups.get(notification.groupKey) === fingerprint;
      this._errorGroups.delete(notification.groupKey);
      this._errorGroups.set(notification.groupKey, fingerprint);
      if (this._errorGroups.size > MAXIMUM_ERROR_GROUPS) {
        const oldest = this._errorGroups.keys().next().value;
        if (oldest !== undefined) this._errorGroups.delete(oldest);
      }
    }
    for (const interceptor of this._interceptors) {
      if (repeated) interceptor.push(notification, true);
      else interceptor.push(notification);
    }
  }

  // #endregion
}
