// #region Imports

import { inject, Injectable } from '@angular/core';
import { ToastService } from '@pixel-brewery/mosaik-elements-angular';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';
import type { INotificationInterceptor } from './INotificationInterceptor';
import type { NotificationKind } from '../models/NotificationKind';
import type { INotificationMessage } from '../models/INotificationMessage';

// #endregion

@Injectable()
export class ToastNotificationInterceptor implements INotificationInterceptor {
  // #region Fields

  private readonly _toastService: ToastService;

  // #endregion

  // #region Ctor

  /**
   * Constructs the Mosaik toast interceptor.
   *
   * @public
   */
  public constructor(toastService: ToastService = inject(ToastService)) {
    this._toastService = toastService;
  }

  // #endregion

  // #region Methods

  /**
   * Pushes.
   *
   * @param notification - Notification.
   * @public
   */
  public push(notification: INotificationMessage): void {
    const toast = this._toastService.show({
      header: notification.title,
      content: notification.content,
      timeout: 5_000,
      closeable: false,
      pressEscapeToClose: true,
      clickOutsideToClose: true,
      showProgress: false,
      appearance: 'soft',
      position: 'bottom-left',
      formatter: 'richtext',
      iconName: this.iconName(notification.kind),
      variant: this.variant(notification.kind),
    });
    toast.element.setAttribute('test-id', `notification-${notification.kind}`);
  }

  private variant(kind: NotificationKind): Variant {
    switch (kind) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      case 'success':
        return 'success';
    }
  }

  private iconName(kind: NotificationKind): string {
    switch (kind) {
      case 'info':
      case 'success':
        return 'checkmarkCircle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'errorCircle';
    }
  }

  // #endregion
}
